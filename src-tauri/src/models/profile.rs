use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum VpnProtocol {
    Socks5,
    Shadowsocks,
    Vless,
    Vmess,
    Trojan,
    Wireguard,
    Hysteria2,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub protocol: VpnProtocol,
    pub server: String,
    pub port: u16,
    
    // Auth fields
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cipher: Option<String>,
    
    // TLS settings
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tls_enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allow_insecure: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpn: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reality_public_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reality_short_id: Option<String>,

    // Transport
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transport_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transport_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transport_host: Option<String>,

    // V2Ray advanced & XTLS
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flow: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fingerprint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub packet_encoding: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alter_id: Option<u32>,

    // WireGuard
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wg_private_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wg_public_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wg_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wg_dns: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wg_mtu: Option<u16>,

    // Metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_name: Option<String>,
    pub is_favorite: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_tested_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for Profile {
    fn default() -> Self {
        Self {
            id: "".to_string(),
            name: "".to_string(),
            protocol: VpnProtocol::Vless,
            server: "".to_string(),
            port: 443,
            username: None,
            password: None,
            uuid: None,
            cipher: None,
            tls_enabled: None,
            server_name: None,
            allow_insecure: None,
            alpn: None,
            reality_public_key: None,
            reality_short_id: None,
            transport_type: None,
            transport_path: None,
            transport_host: None,
            flow: None,
            fingerprint: None,
            packet_encoding: None,
            alter_id: None,
            wg_private_key: None,
            wg_public_key: None,
            wg_address: None,
            wg_dns: None,
            wg_mtu: None,
            country_code: None,
            group_name: None,
            is_favorite: false,
            latency_ms: None,
            last_tested_at: None,
            subscription_id: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}
