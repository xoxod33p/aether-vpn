use crate::models::LogEntry;
use crate::network::{GeoIpService, PublicIpInfo, DnsLeakResult};

#[tauri::command]
pub async fn get_logs() -> Result<Vec<LogEntry>, String> {
    Ok(crate::core::get_all_logs())
}

#[tauri::command]
pub async fn clear_logs() -> Result<(), String> {
    crate::core::clear_all_logs();
    Ok(())
}

#[tauri::command]
pub async fn get_real_public_ip() -> Result<PublicIpInfo, String> {
    GeoIpService::fetch_current_ip().await
}

#[tauri::command]
pub async fn run_dns_leak_test() -> Result<DnsLeakResult, String> {
    GeoIpService::run_dns_leak_probe().await
}
