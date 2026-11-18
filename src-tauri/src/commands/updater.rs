use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub current_version: String,
    pub latest_version: String,
    pub is_update_available: bool,
    pub release_name: String,
    pub release_notes: String,
    pub published_at: String,
    pub release_url: String,
    pub download_url: Option<String>,
    pub asset_name: Option<String>,
    pub asset_size: Option<u64>,
    pub platform: String,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    published_at: Option<String>,
    html_url: String,
    assets: Vec<GithubAsset>,
}

fn compare_semver(current: &str, latest: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|p| p.parse::<u32>().ok())
            .collect()
    };
    let c = parse(current);
    let l = parse(latest);
    for i in 0..c.len().max(l.len()) {
        let cv = c.get(i).copied().unwrap_or(0);
        let lv = l.get(i).copied().unwrap_or(0);
        if lv > cv {
            return true;
        }
        if lv < cv {
            return false;
        }
    }
    false
}

fn get_db_path() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("AetherVPN")
        .join("aether.db")
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateCheckResult, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let platform = if cfg!(windows) {
        "windows"
    } else {
        "linux"
    };

    let client = reqwest::Client::builder()
        .user_agent("AetherVPN-Desktop-Client")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get("https://api.github.com/repos/xoxod33p/aether-vpn/releases/latest")
        .send()
        .await
        .map_err(|e| format!("Failed to connect to update server: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Update server returned error: {}", res.status()));
    }

    let release: GithubRelease = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse release metadata: {}", e))?;

    let latest_version = release.tag_name.trim_start_matches('v').to_string();
    let is_update_available = compare_semver(&current_version, &latest_version);

    let mut download_url = None;
    let mut asset_name = None;
    let mut asset_size = None;

    if cfg!(windows) {
        if let Some(asset) = release.assets.iter().find(|a| a.name.ends_with("_x64-setup.exe")) {
            download_url = Some(asset.browser_download_url.clone());
            asset_name = Some(asset.name.clone());
            asset_size = Some(asset.size);
        } else if let Some(asset) = release.assets.iter().find(|a| a.name.ends_with(".exe")) {
            download_url = Some(asset.browser_download_url.clone());
            asset_name = Some(asset.name.clone());
            asset_size = Some(asset.size);
        }
    } else {
        if let Some(asset) = release.assets.iter().find(|a| a.name.ends_with(".deb")) {
            download_url = Some(asset.browser_download_url.clone());
            asset_name = Some(asset.name.clone());
            asset_size = Some(asset.size);
        }
    }

    Ok(UpdateCheckResult {
        current_version,
        latest_version,
        is_update_available,
        release_name: release.name.unwrap_or_else(|| release.tag_name.clone()),
        release_notes: release.body.unwrap_or_default(),
        published_at: release.published_at.unwrap_or_default(),
        release_url: release.html_url,
        download_url,
        asset_name,
        asset_size,
        platform: platform.to_string(),
    })
}

#[tauri::command]
pub async fn download_and_install_update(download_url: String) -> Result<String, String> {
    let db_path = get_db_path();
    if db_path.exists() {
        let bak_path = db_path.with_extension("db.bak");
        let _ = std::fs::copy(&db_path, &bak_path);
    }

    let client = reqwest::Client::builder()
        .user_agent("AetherVPN-Desktop-Client")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Download failed with status: {}", res.status()));
    }

    let bytes = res.bytes().await.map_err(|e| format!("Failed to read update file: {}", e))?;

    #[cfg(windows)]
    {
        let temp_dir = std::env::temp_dir();
        let target_path = temp_dir.join("AetherVPN_Update_Setup.exe");
        std::fs::write(&target_path, &bytes).map_err(|e| format!("Failed to write update binary: {}", e))?;

        std::process::Command::new(&target_path)
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;

        Ok("Installer launched successfully. The application will close shortly to finalize the update.".to_string())
    }

    #[cfg(not(windows))]
    {
        let target_path = PathBuf::from("/tmp/aether-vpn-update.deb");
        std::fs::write(&target_path, &bytes).map_err(|e| format!("Failed to write deb package: {}", e))?;

        if std::process::Command::new("pkexec")
            .arg("dpkg")
            .arg("-i")
            .arg(&target_path)
            .spawn()
            .is_ok()
        {
            Ok("Package manager launched to install update.".to_string())
        } else if std::process::Command::new("xdg-open")
            .arg(&target_path)
            .spawn()
            .is_ok()
        {
            Ok("Package opened in default software manager.".to_string())
        } else {
            Ok(format!("Update downloaded to {:?}. Run: sudo dpkg -i {:?}", target_path, target_path))
        }
    }
}

#[tauri::command]
pub async fn backup_database() -> Result<String, String> {
    let db_path = get_db_path();
    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }
    let bak_path = db_path.with_extension("db.bak");
    std::fs::copy(&db_path, &bak_path).map_err(|e| format!("Failed to create database backup: {}", e))?;
    Ok(bak_path.to_string_lossy().to_string())
}
