use std::time::Duration;
use tauri::State;
use tracing::{info, warn};

use crate::models::Profile;
use crate::network::{LatencyTester, SubscriptionParser};
use crate::storage::Database;

#[tauri::command]
pub async fn get_profiles(db: State<'_, Database>) -> Result<Vec<Profile>, String> {
    db.get_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_profile(profile: Profile, db: State<'_, Database>) -> Result<Profile, String> {
    db.save_profile(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
pub async fn delete_profile(id: String, db: State<'_, Database>) -> Result<(), String> {
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
