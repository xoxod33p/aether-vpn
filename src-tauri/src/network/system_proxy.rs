#[allow(unused_imports)]
use tracing::{info, warn};

#[derive(Default, Clone)]
pub struct ProxyBackup {
    pub enabled: bool,
    pub server: String,
    pub override_hosts: String,
}

pub struct SystemProxyManager;

impl SystemProxyManager {
    #[cfg(target_os = "windows")]
    pub fn enable_windows(port: u16) -> Result<ProxyBackup, String> {
        info!("Configuring Windows system proxy on 127.0.0.1:{}", port);
        
        let backup = Self::get_windows_proxy_settings().unwrap_or_default();

        let ps_cmd = format!(
            r#"Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyEnable -Value 1 -Type DWord;
               Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyServer -Value '127.0.0.1:{}' -Type String;
               Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyOverride -Value '<local>;localhost;127.*;10.*;192.168.*' -Type String"#,
            port
        );

        let output = crate::core::silent_command("powershell")
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &ps_cmd])
            .output()
            .map_err(|e| format!("Failed to set Windows proxy registry: {}", e))?;

        if !output.status.success() {
            let err_str = String::from_utf8_lossy(&output.stderr);
            warn!("Proxy registry configuration warning: {}", err_str);
        }

        info!("Windows system proxy enabled successfully.");
        Ok(backup)
    }

    #[cfg(target_os = "windows")]
    pub fn disable_windows(backup: Option<ProxyBackup>) -> Result<(), String> {
        info!("Restoring Windows system proxy settings...");

        let (enabled, server) = match backup {
            Some(b) => (if b.enabled { 1 } else { 0 }, b.server),
            None => (0, String::new()),
        };

        let ps_cmd = format!(
            r#"Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyEnable -Value {} -Type DWord;
               Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyServer -Value '{}' -Type String"#,
            enabled, server
        );

        let _ = crate::core::silent_command("powershell")
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &ps_cmd])
            .output();

        info!("Windows system proxy disabled / restored.");
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn get_windows_proxy_settings() -> Result<ProxyBackup, String> {
        let ps_cmd = r#"$p = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'; [PSCustomObject]@{Enabled=$p.ProxyEnable; Server=$p.ProxyServer; Override=$p.ProxyOverride} | ConvertTo-Json -Compress"#;
        
        let output = crate::core::silent_command("powershell")
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps_cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                return Ok(ProxyBackup {
                    enabled: v["Enabled"].as_i64().unwrap_or(0) == 1,
                    server: v["Server"].as_str().unwrap_or("").to_string(),
                    override_hosts: v["Override"].as_str().unwrap_or("").to_string(),
                });
            }
        }
        Ok(ProxyBackup::default())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn enable_linux(port: u16) -> Result<ProxyBackup, String> {
        info!("Configuring Linux GSettings system proxy on 127.0.0.1:{}", port);
        let _ = std::process::Command::new("gsettings")
            .args(["set", "org.gnome.system.proxy", "mode", "'manual'"])
            .output();
        let _ = std::process::Command::new("gsettings")
            .args(["set", "org.gnome.system.proxy.socks", "host", "'127.0.0.1'"])
            .output();
        let _ = std::process::Command::new("gsettings")
            .args(["set", "org.gnome.system.proxy.socks", "port", &port.to_string()])
            .output();
        Ok(ProxyBackup::default())
    }

    #[cfg(not(target_os = "windows"))]
    pub fn disable_linux(_backup: Option<ProxyBackup>) -> Result<(), String> {
        info!("Disabling Linux system proxy...");
        let _ = std::process::Command::new("gsettings")
            .args(["set", "org.gnome.system.proxy", "mode", "'none'"])
            .output();
        Ok(())
    }
}
