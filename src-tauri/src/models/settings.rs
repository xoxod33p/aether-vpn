use serde::{Deserialize, Serialize};
use super::connection::OperatingMode;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub start_on_boot: bool,
    pub minimize_to_tray: bool,
    pub start_minimized: bool,
    pub default_mode: OperatingMode,
    pub auto_reconnect: bool,
    pub connection_timeout_secs: u32,
    pub kill_switch_enabled: bool,
    pub dns_leak_protection: bool,
    pub mtu: u16,
    pub enable_ipv6: bool,
    pub socks_port: u16,
    pub http_port: u16,
    pub clash_api_port: u16,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            language: "en-US".to_string(),
            start_on_boot: false,
            minimize_to_tray: true,
            start_minimized: false,
            default_mode: OperatingMode::Tun,
            auto_reconnect: true,
            connection_timeout_secs: 15,
            kill_switch_enabled: false,
            dns_leak_protection: true,
            mtu: 9000,
            enable_ipv6: false,
            socks_port: 2080,
            http_port: 2081,
            clash_api_port: 9090,
        }
    }
}
