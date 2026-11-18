use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficStats {
    pub download_speed_bps: u64,
    pub upload_speed_bps: u64,
    pub total_download_bytes: u64,
    pub total_upload_bytes: u64,
    pub active_connections: u32,
    pub latency_ms: u32,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUsage {
    pub process_name: String,
    pub display_name: String,
    pub upload_bytes: u64,
    pub download_bytes: u64,
    pub upload_speed_bps: u64,
    pub download_speed_bps: u64,
    pub active_connections: u32,
    pub icon_type: String,
    pub destination_hosts: Vec<String>,
    pub last_seen: String,
}
