use std::sync::Arc;
use parking_lot::RwLock;
use tracing::debug;
use crate::models::TrafficStats;

pub struct TrafficMonitor;

impl TrafficMonitor {
    pub async fn fetch_clash_traffic(
        port: u16,
        stats: Arc<RwLock<TrafficStats>>,
    ) {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(1200))
            .build()
            .unwrap_or_default();

        let conn_url = format!("http://127.0.0.1:{}/connections", port);

        if let Ok(resp) = client.get(&conn_url).send().await {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let down_total = json["downloadTotal"].as_u64().unwrap_or(0);
                let up_total = json["uploadTotal"].as_u64().unwrap_or(0);
                let active_conns = json["connections"].as_array().map(|a| a.len() as u32).unwrap_or(0);

                let mut s = stats.write();
                let prev_down = s.total_download_bytes;
                let prev_up = s.total_upload_bytes;

                s.download_speed_bps = if down_total >= prev_down { down_total - prev_down } else { 0 };
                s.upload_speed_bps = if up_total >= prev_up { up_total - prev_up } else { 0 };
                s.total_download_bytes = down_total;
                s.total_upload_bytes = up_total;
                s.active_connections = active_conns;
                s.timestamp = chrono::Utc::now().timestamp();
                debug!("Updated live traffic from Clash API: down={} up={} conns={}", s.download_speed_bps, s.upload_speed_bps, active_conns);
            }
        }
    }

    pub async fn test_proxy_delay(port: u16, proxy_tag: &str) -> Result<u32, String> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .unwrap_or_default();

        let url = format!(
            "http://127.0.0.1:{}/proxies/{}/delay?timeout=4000&url=http%3A%2F%2Fcp.cloudflare.com%2Fgenerate_204",
            port, proxy_tag
        );

        match client.get(&url).send().await {
            Ok(resp) => {
                if let Ok(val) = resp.json::<serde_json::Value>().await {
                    if let Some(delay) = val["delay"].as_u64() {
                        return Ok(delay as u32);
                    }
                    if let Some(msg) = val["message"].as_str() {
                        return Err(format!("Clash delay test error: {}", msg));
                    }
                }
                Err("Invalid delay response from sing-box Clash API".to_string())
            }
            Err(e) => Err(format!("Clash delay endpoint request failed: {}", e)),
        }
    }
}
