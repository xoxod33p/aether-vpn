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

#[tauri::command]
pub async fn get_device_id() -> Result<String, String> {
    #[cfg(windows)]
    {
        if let Ok(output) = crate::core::silent_command("reg")
            .args(["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
            .output()
        {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                for line in text.lines() {
                    if line.contains("MachineGuid") {
                        if let Some(guid) = line.split_whitespace().last() {
                            if !guid.is_empty() && guid.len() >= 16 {
                                return Ok(guid.trim().to_uppercase());
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(not(windows))]
    {
        if let Ok(content) = std::fs::read_to_string("/etc/machine-id") {
            let trimmed = content.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_uppercase());
            }
        }
        if let Ok(content) = std::fs::read_to_string("/var/lib/dbus/machine-id") {
            let trimmed = content.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_uppercase());
            }
        }
    }

    let dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("AetherVPN");
    let _ = std::fs::create_dir_all(&dir);
    let id_file = dir.join("device.id");

    if let Ok(existing) = std::fs::read_to_string(&id_file) {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_uppercase());
        }
    }

    let generated = uuid::Uuid::new_v4().to_string().to_uppercase();
    let _ = std::fs::write(&id_file, &generated);
    Ok(generated)
}
