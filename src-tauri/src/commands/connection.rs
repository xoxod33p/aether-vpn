use tauri::State;
use crate::models::{ConnectionInfo, TrafficStats};
use crate::core::ConnectionManager;

#[tauri::command]
pub async fn connect_vpn(
    profile_id: String,
    manager: State<'_, ConnectionManager>,
) -> Result<ConnectionInfo, String> {
    manager.connect(&profile_id).await
}

#[tauri::command]
pub async fn disconnect_vpn(
    manager: State<'_, ConnectionManager>,
) -> Result<ConnectionInfo, String> {
    manager.disconnect().await
}

#[tauri::command]
pub async fn get_connection_status(
    manager: State<'_, ConnectionManager>,
) -> Result<ConnectionInfo, String> {
    Ok(manager.get_status())
}

#[tauri::command]
pub async fn get_traffic_stats(
    manager: State<'_, ConnectionManager>,
) -> Result<TrafficStats, String> {
    Ok(manager.get_traffic_stats())
}
