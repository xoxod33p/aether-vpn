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

#[tauri::command]
pub async fn minimize_window(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(desktop)]
    {
        use tauri::Manager;
        if let Some(window) = app.get_webview_window("main") {
            let db = app.state::<Database>();
            let minimize_to_tray = db.get_settings().map(|s| s.minimize_to_tray).unwrap_or(false);
            if minimize_to_tray {
                window.hide().map_err(|e| e.to_string())?;
            } else {
                window.minimize().map_err(|e| e.to_string())?;
            }
        }
    }
    #[cfg(not(desktop))]
    {
        let _ = app;
    }
    Ok(())
}
