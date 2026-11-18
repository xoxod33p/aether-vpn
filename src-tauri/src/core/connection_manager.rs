use std::sync::Arc;
use parking_lot::RwLock;
use tracing::{info, warn};

use crate::models::{
    ConnectionInfo, ConnectionStatus, OperatingMode, GeoLocation, TrafficStats, AppUsage,
};
use crate::storage::Database;
use crate::protocols::SingboxConfigBuilder;
use crate::core::process_manager::ProcessManager;
use crate::core::traffic_monitor::TrafficMonitor;
use crate::network::system_proxy::{SystemProxyManager, ProxyBackup};
use crate::network::firewall::KillSwitchManager;
use crate::network::GeoIpService;

#[derive(Clone)]
pub struct ConnectionManager {
    info: Arc<RwLock<ConnectionInfo>>,
    stats: Arc<RwLock<TrafficStats>>,
    app_usages: Arc<RwLock<Vec<AppUsage>>>,
    process_mgr: Arc<ProcessManager>,
    proxy_backup: Arc<RwLock<Option<ProxyBackup>>>,
    db: Database,
}

impl ConnectionManager {
    pub fn new(db: Database) -> Self {
        let initial_info = ConnectionInfo {
            status: ConnectionStatus::Disconnected,
            mode: OperatingMode::Tun,
            active_profile_id: None,
            connected_at: None,
            public_ip: None,
            location: None,
            error_message: None,
        };

        let initial_stats = TrafficStats {
            download_speed_bps: 0,
            upload_speed_bps: 0,
            total_download_bytes: 0,
            total_upload_bytes: 0,
            active_connections: 0,
            latency_ms: 0,
            timestamp: chrono::Utc::now().timestamp(),
        };

        Self {
            info: Arc::new(RwLock::new(initial_info)),
            stats: Arc::new(RwLock::new(initial_stats)),
            app_usages: Arc::new(RwLock::new(Vec::new())),
            process_mgr: Arc::new(ProcessManager::new()),
            proxy_backup: Arc::new(RwLock::new(None)),
            db,
        }
    }

    pub fn get_status(&self) -> ConnectionInfo {
        self.info.read().clone()
    }

    pub fn get_traffic_stats(&self) -> TrafficStats {
        self.stats.read().clone()
    }

    pub fn get_app_usages(&self) -> Vec<AppUsage> {
        self.app_usages.read().clone()
    }

    pub async fn connect(&self, profile_id: &str) -> Result<ConnectionInfo, String> {
        let profiles = self.db.get_profiles().map_err(|e| e.to_string())?;
        let profile = profiles
            .iter()
            .find(|p| p.id == profile_id)
            .cloned()
            .ok_or_else(|| format!("Profile '{}' not found", profile_id))?;

        info!("Starting connection for profile '{}' ({}:{})", profile.name, profile.server, profile.port);
        crate::core::append_log("info", &format!("Initiating connection to '{}' ({}:{})...", profile.name, profile.server, profile.port), Some("core::conn"));

        {
            let mut info = self.info.write();
            info.status = ConnectionStatus::Connecting;
            info.active_profile_id = Some(profile_id.to_string());
            info.error_message = None;
        }

        let settings = self.db.get_settings().unwrap_or_default();
        let dns = self.db.get_dns_config().unwrap_or_default();
        let rules = self.db.get_routing_rules().unwrap_or_default();

        let config_json = SingboxConfigBuilder::build(&profile, &settings, &dns, &rules);

        if let Err(err) = self.process_mgr.start(config_json).await {
            let mut info = self.info.write();
            info.status = ConnectionStatus::Error;
            info.error_message = Some(err.clone());
            crate::core::append_log("error", &format!("Failed to start VPN core: {}", err), Some("core::conn"));
            return Err(err);
        }

        if settings.kill_switch_enabled {
            if let Err(e) = KillSwitchManager::enable(&profile.server, profile.port) {
                warn!("Kill switch activation warning: {}", e);
                crate::core::append_log("warn", &format!("Kill switch warning: {}", e), Some("core::fw"));
            } else {
                crate::core::append_log("info", "Packet-filter Kill Switch engaged", Some("core::fw"));
            }
        }

        if settings.default_mode == OperatingMode::Tun && !settings.enable_ipv6 {
            #[cfg(target_os = "windows")]
            {
                tokio::spawn(async {
                    tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
                    let ps_cmd = "Disable-NetAdapterBinding -Name 'AetherTun' -ComponentID 'ms_tcpip6' -Confirm:$false -ErrorAction SilentlyContinue; Get-NetConnectionProfile -InterfaceAlias 'AetherTun' | Out-Null";
                    let _ = crate::core::silent_command("powershell")
                        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps_cmd])
                        .output();
                    crate::core::append_log("info", "Configured AetherTun adapter bindings (IPv4 NCSI alignment)", Some("core::tun"));
                });
            }
        }

        if settings.default_mode == OperatingMode::SystemProxy {
            #[cfg(target_os = "windows")]
            {
                match SystemProxyManager::enable_windows(settings.socks_port) {
                    Ok(backup) => {
                        *self.proxy_backup.write() = Some(backup);
                        crate::core::append_log("info", &format!("System proxy enabled on 127.0.0.1:{}", settings.socks_port), Some("core::proxy"));
                    }
                    Err(e) => {
                        warn!("Failed to set system proxy: {}", e);
                        crate::core::append_log("warn", &format!("Failed to set system proxy: {}", e), Some("core::proxy"));
                    }
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = SystemProxyManager::enable_linux(settings.socks_port);
                crate::core::append_log("info", &format!("Linux proxy configured on 127.0.0.1:{}", settings.socks_port), Some("core::proxy"));
            }
        }

        let now_str = chrono::Utc::now().to_rfc3339();

        let updated_info = ConnectionInfo {
            status: ConnectionStatus::Connected,
            mode: settings.default_mode,
            active_profile_id: Some(profile_id.to_string()),
            connected_at: Some(now_str),
            public_ip: None,
            location: None,
            error_message: None,
        };

        *self.info.write() = updated_info.clone();
        crate::core::append_log("info", "Encrypted connection established. Starting live Clash traffic poller.", Some("core::conn"));

        let info_ip_check = self.info.clone();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
            if let Ok(ip_info) = GeoIpService::fetch_current_ip().await {
                let mut current = info_ip_check.write();
                if current.status == ConnectionStatus::Connected {
                    current.public_ip = Some(ip_info.ip.clone());
                    current.location = Some(GeoLocation {
                        country: ip_info.country.clone(),
                        city: ip_info.city.clone(),
                        country_code: ip_info.country_code.clone(),
                    });
                    crate::core::append_log("info", &format!("VPN public egress IP verified: {} ({}, {})", ip_info.ip, ip_info.city, ip_info.country), Some("core::net"));
                }
            }
        });

        let stats_arc = self.stats.clone();
        let app_usages_arc = self.app_usages.clone();
        let info_arc = self.info.clone();
        let process_mgr_arc = self.process_mgr.clone();
        let clash_port = settings.clash_api_port;

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(1000));
            loop {
                interval.tick().await;

                {
                    let current = info_arc.read();
                    if current.status != ConnectionStatus::Connected {
                        break;
                    }
                }

                if !process_mgr_arc.is_running().await {
                    let err_msg = process_mgr_arc.get_last_error()
                        .unwrap_or_else(|| "VPN core terminated unexpectedly".to_string());
                    warn!("VPN core exited: {}", err_msg);
                    crate::core::append_log("error", &format!("VPN core exited: {}", err_msg), Some("core::engine"));
                    let mut current = info_arc.write();
                    current.status = ConnectionStatus::Error;
                    current.error_message = Some(err_msg);
                    break;
                }

                TrafficMonitor::fetch_clash_traffic(clash_port, stats_arc.clone(), app_usages_arc.clone()).await;
            }
        });

        Ok(updated_info)
    }

    pub async fn disconnect(&self) -> Result<ConnectionInfo, String> {
        info!("Tearing down connection and restoring networking...");
        crate::core::append_log("info", "Tearing down connection and restoring networking...", Some("core::conn"));

        let _ = self.process_mgr.stop().await;

        let _ = KillSwitchManager::disable();

        let backup = self.proxy_backup.write().take();
        #[cfg(target_os = "windows")]
        {
            let _ = SystemProxyManager::disable_windows(backup);
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = SystemProxyManager::disable_linux(backup);
        }

        let disconnected_info = ConnectionInfo {
            status: ConnectionStatus::Disconnected,
            mode: OperatingMode::Tun,
            active_profile_id: None,
            connected_at: None,
            public_ip: None,
            location: None,
            error_message: None,
        };

        *self.info.write() = disconnected_info.clone();

        {
            let mut s = self.stats.write();
            s.download_speed_bps = 0;
            s.upload_speed_bps = 0;
            s.active_connections = 0;
            s.latency_ms = 0;
        }

        self.app_usages.write().clear();

        info!("Connection torn down. Networking restored.");
        crate::core::append_log("info", "Tunnel disconnected cleanly. System networking restored.", Some("core::conn"));

        let info_disc_ip = self.info.clone();
        tokio::spawn(async move {
            if let Ok(ip_info) = GeoIpService::fetch_current_ip().await {
                let mut current = info_disc_ip.write();
                if current.status == ConnectionStatus::Disconnected {
                    current.public_ip = Some(ip_info.ip.clone());
                    current.location = Some(GeoLocation {
                        country: ip_info.country,
                        city: ip_info.city,
                        country_code: ip_info.country_code,
                    });
                    crate::core::append_log("info", &format!("Local public IP: {}", ip_info.ip), Some("core::net"));
                }
            }
        });

        Ok(disconnected_info)
    }
}
