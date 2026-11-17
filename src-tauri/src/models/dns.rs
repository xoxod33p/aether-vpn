use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsConfig {
    pub provider_type: String, // 'doh', 'dot', 'system', 'custom'
    pub primary_dns: String,
    pub fallback_dns: String,
    pub enable_dns_routing: bool,
    pub prevent_leak: bool,
}

impl Default for DnsConfig {
    fn default() -> Self {
        Self {
            provider_type: "doh".to_string(),
            primary_dns: "https://1.1.1.1/dns-query".to_string(),
            fallback_dns: "https://8.8.8.8/dns-query".to_string(),
            enable_dns_routing: true,
            prevent_leak: true,
        }
    }
}
