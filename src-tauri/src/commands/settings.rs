use tauri::State;
use crate::models::{AppSettings, DnsConfig};
use crate::storage::Database;

#[tauri::command]
pub async fn get_settings(db: State<'_, Database>) -> Result<AppSettings, String> {
    db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(settings: AppSettings, db: State<'_, Database>) -> Result<AppSettings, String> {
    db.save_settings(&settings).map_err(|e| e.to_string())?;
    Ok(settings)
}

#[tauri::command]
pub async fn get_dns_config(db: State<'_, Database>) -> Result<DnsConfig, String> {
    db.get_dns_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_dns_config(config: DnsConfig, db: State<'_, Database>) -> Result<DnsConfig, String> {
    db.save_dns_config(&config).map_err(|e| e.to_string())?;
    Ok(config)
}
