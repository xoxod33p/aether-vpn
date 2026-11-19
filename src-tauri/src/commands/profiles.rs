use std::time::Duration;
use tauri::State;
use tracing::{info, warn};

use crate::models::{Profile, ConnectionStatus, VpnProtocol};
use crate::core::ConnectionManager;
use crate::network::{LatencyTester, SubscriptionParser};
use crate::storage::Database;

#[tauri::command]
pub async fn get_profiles(db: State<'_, Database>) -> Result<Vec<Profile>, String> {
    db.get_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_profile(
    profile: Profile,
    db: State<'_, Database>,
    conn_mgr: State<'_, ConnectionManager>,
) -> Result<Profile, String> {
    let status = conn_mgr.get_status();
    if (status.status == ConnectionStatus::Connected || status.status == ConnectionStatus::Connecting)
        && status.active_profile_id.as_deref() == Some(&profile.id)
    {
        return Err("Cannot edit active server configuration while VPN is connected. Please disconnect first.".to_string());
    }

    if let Ok(Some(existing)) = db.get_profile(&profile.id) {
        if existing.group_name.as_deref() == Some("Free Sync")
            || existing.id.starts_with("cfg-")
            || existing.id.starts_with("sync-")
        {
            return Err("Free cloud servers cannot be edited or modified.".to_string());
        }
    }
    db.save_profile(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
pub async fn delete_profile(
    id: String,
    db: State<'_, Database>,
    conn_mgr: State<'_, ConnectionManager>,
) -> Result<(), String> {
    let status = conn_mgr.get_status();
    if (status.status == ConnectionStatus::Connected || status.status == ConnectionStatus::Connecting)
        && status.active_profile_id.as_deref() == Some(&id)
    {
        return Err("Cannot delete active server configuration while VPN is connected. Please disconnect first.".to_string());
    }
    db.delete_profile(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_profile_latency(id: String, db: State<'_, Database>) -> Result<u32, String> {
    let profile = db.get_profile(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Profile not found: {}", id))?;

    info!("Measuring real TCP handshake latency to {}:{}...", profile.server, profile.port);

    let latency = match LatencyTester::measure_tcp_latency(
        &profile.server,
        profile.port,
        Duration::from_millis(3500),
    ).await {
        Ok(ms) => ms,
        Err(err) => {
            warn!("Latency test failed: {}", err);
            999
        }
    };

    let now = chrono::Utc::now().to_rfc3339();
    let _ = db.update_profile_latency(&id, latency, &now);

    Ok(latency)
}

#[tauri::command]
pub async fn import_profile_link(link: String, db: State<'_, Database>) -> Result<Profile, String> {
    let link = link.trim();
    let profiles = SubscriptionParser::parse_share_links(link, "manual_import");
    if let Some(profile) = profiles.into_iter().next() {
        db.save_profile(&profile).map_err(|e| e.to_string())?;
        Ok(profile)
    } else {
        Err("Invalid or unsupported share link format. Supported: vless://, vmess://, trojan://, ss://".to_string())
    }
}

#[derive(serde::Deserialize)]
struct CloudSyncResponse {
    servers: Option<Vec<serde_json::Value>>,
}

fn get_env_or_file(key: &str) -> Option<String> {
    if let Ok(v) = std::env::var(key) {
        if !v.trim().is_empty() {
            return Some(v.trim().to_string());
        }
    }

    let candidates = [
        std::path::PathBuf::from(".env"),
        std::path::PathBuf::from("../.env"),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join(".env")))
            .unwrap_or_default(),
    ];

    for path in &candidates {
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(path) {
                for line in content.lines() {
                    let line = line.trim();
                    if line.is_empty() || line.starts_with('#') {
                        continue;
                    }
                    if let Some((k, v)) = line.split_once('=') {
                        if k.trim() == key {
                            let clean_val = v.trim().trim_matches('"').trim_matches('\'');
                            if !clean_val.is_empty() {
                                return Some(clean_val.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

#[tauri::command]
pub async fn sync_cloud_servers(
    api_url: Option<String>,
    api_key: Option<String>,
    db: State<'_, Database>,
) -> Result<Vec<Profile>, String> {
    let url = api_url
        .filter(|s| !s.trim().is_empty())
        .or_else(|| get_env_or_file("AETHER_CLOUD_API_URL"))
        .or_else(|| get_env_or_file("VITE_CLOUD_API_URL"))
        .or_else(|| option_env!("AETHER_CLOUD_API_URL").filter(|s| !s.trim().is_empty()).map(|s| s.to_string()))
        .or_else(|| option_env!("VITE_CLOUD_API_URL").filter(|s| !s.trim().is_empty()).map(|s| s.to_string()))
        .unwrap_or_else(|| "https://aether-backend-drab.vercel.app/api/configs".to_string());

    let key = api_key
        .filter(|s| !s.trim().is_empty())
        .or_else(|| get_env_or_file("AETHER_CLOUD_API_KEY"))
        .or_else(|| get_env_or_file("VITE_CLOUD_API_KEY"))
        .or_else(|| option_env!("AETHER_CLOUD_API_KEY").filter(|s| !s.trim().is_empty()).map(|s| s.to_string()))
        .or_else(|| option_env!("VITE_CLOUD_API_KEY").filter(|s| !s.trim().is_empty()).map(|s| s.to_string()))
        .unwrap_or_else(|| "aether_sync_super_secret_key_123".to_string());

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| format!("HTTP client init failed: {}", e))?;

    let resp = client
        .get(&url)
        .header("X-API-Key", &key)
        .query(&[("key", &key)])
        .send()
        .await
        .map_err(|e| format!("Failed to reach sync endpoint: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Cloud sync returned HTTP status {}", resp.status()));
    }

    let body_text = resp.text().await.map_err(|e| format!("Failed reading response: {}", e))?;

    let raw_list: Vec<serde_json::Value> = if let Ok(parsed) = serde_json::from_str::<CloudSyncResponse>(&body_text) {
        parsed.servers.unwrap_or_default()
    } else if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(&body_text) {
        arr
    } else {
        Vec::new()
    };

    let mut synced_profiles = Vec::new();

    for s in raw_list {
        let server_host = match s.get("server").and_then(|v| v.as_str()) {
            Some(h) if !h.trim().is_empty() => h.trim().to_string(),
            _ => continue,
        };
        let port = match s.get("port").and_then(|v| v.as_u64()) {
            Some(p) if p > 0 && p <= 65535 => p as u16,
            _ => continue,
        };

        let proto_str = s.get("protocol").and_then(|v| v.as_str()).unwrap_or("vless").to_lowercase();
        let protocol = match proto_str.as_str() {
            "vless" => VpnProtocol::Vless,
            "vmess" => VpnProtocol::Vmess,
            "trojan" => VpnProtocol::Trojan,
            "shadowsocks" | "ss" => VpnProtocol::Shadowsocks,
            "socks5" | "socks" => VpnProtocol::Socks5,
            "wireguard" | "wg" => VpnProtocol::Wireguard,
            "hysteria2" | "hy2" => VpnProtocol::Hysteria2,
            _ => VpnProtocol::Vless,
        };

        let raw_id = s.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
        let id = if !raw_id.is_empty() {
            raw_id.to_string()
        } else {
            format!("sync-{}-{}-{}", proto_str, server_host, port)
        };

        let name = s.get("name").and_then(|v| v.as_str())
            .filter(|n| !n.trim().is_empty())
            .map(|n| n.to_string())
            .unwrap_or_else(|| format!("Free {} - {}", s.get("countryCode").and_then(|v| v.as_str()).unwrap_or("Server"), server_host));

        let country_code = s.get("countryCode").and_then(|v| v.as_str()).unwrap_or("US").to_string();

        let profile = Profile {
            id,
            name,
            protocol,
            server: server_host.clone(),
            port,
            username: s.get("username").and_then(|v| v.as_str()).map(|v| v.to_string()),
            password: s.get("password").and_then(|v| v.as_str()).map(|v| v.to_string()),
            uuid: s.get("uuid").and_then(|v| v.as_str()).map(|v| v.to_string()),
            cipher: s.get("cipher").and_then(|v| v.as_str()).map(|v| v.to_string()),
            tls_enabled: s.get("tlsEnabled").or_else(|| s.get("tls_enabled")).and_then(|v| v.as_bool()).or(Some(true)),
            server_name: s.get("serverName").or_else(|| s.get("server_name")).and_then(|v| v.as_str()).map(|v| v.to_string()),
            allow_insecure: s.get("allowInsecure").or_else(|| s.get("allow_insecure")).and_then(|v| v.as_bool()),
            reality_public_key: s.get("realityPublicKey").or_else(|| s.get("reality_public_key")).and_then(|v| v.as_str()).map(|v| v.to_string()),
            reality_short_id: s.get("realityShortId").or_else(|| s.get("reality_short_id")).and_then(|v| v.as_str()).map(|v| v.to_string()),
            transport_type: s.get("transportType").or_else(|| s.get("transport_type")).and_then(|v| v.as_str()).map(|v| v.to_string()),
            transport_path: s.get("transportPath").or_else(|| s.get("transport_path")).and_then(|v| v.as_str()).map(|v| v.to_string()),
            transport_host: s.get("transportHost").or_else(|| s.get("transport_host")).and_then(|v| v.as_str()).map(|v| v.to_string()),
            flow: s.get("flow").and_then(|v| v.as_str()).map(|v| v.to_string()),
            fingerprint: s.get("fingerprint").and_then(|v| v.as_str()).map(|v| v.to_string()),
            country_code: Some(country_code),
            group_name: Some("Free Sync".to_string()),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            ..Default::default()
        };

        if let Ok(_) = db.save_profile(&profile) {
            synced_profiles.push(profile);
        }
    }

    Ok(synced_profiles)
}
