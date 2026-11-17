use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Disconnecting,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OperatingMode {
    Tun,
    SystemProxy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeoLocation {
    pub country: String,
    pub city: String,
    pub country_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInfo {
    pub status: ConnectionStatus,
    pub mode: OperatingMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_profile_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connected_at: Option<String>,
    pub public_ip: Option<String>,
    pub location: Option<GeoLocation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}
