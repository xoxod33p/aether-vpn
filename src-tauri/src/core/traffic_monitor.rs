use std::sync::Arc;
use std::collections::HashMap;
use parking_lot::RwLock;
use tracing::debug;
use crate::models::{TrafficStats, AppUsage};

pub struct TrafficMonitor;

impl TrafficMonitor {
    fn map_process_info(raw_process: &str, raw_path: &str, host: &str) -> (String, String, String) {
        let mut exe_name = raw_process.trim().to_lowercase();
        if exe_name.is_empty() && !raw_path.is_empty() {
            if let Some(file_name) = std::path::Path::new(raw_path).file_name().and_then(|n| n.to_str()) {
                exe_name = file_name.trim().to_lowercase();
            }
        }

        if exe_name.is_empty() {
            let h = host.to_lowercase();
            if h.contains("youtube") || h.contains("google") || h.contains("gstatic") {
                return ("chrome.exe".to_string(), "Web Browser".to_string(), "browser".to_string());
            } else if h.contains("discord") {
                return ("discord.exe".to_string(), "Discord".to_string(), "chat".to_string());
            } else if h.contains("spotify") {
                return ("spotify.exe".to_string(), "Spotify".to_string(), "media".to_string());
            } else if h.contains("telegram") {
                return ("telegram.exe".to_string(), "Telegram".to_string(), "chat".to_string());
            } else if h.contains("steam") {
                return ("steam.exe".to_string(), "Steam".to_string(), "game".to_string());
            } else if h.contains("github") || h.contains("microsoft") {
                return ("system.exe".to_string(), "System Services".to_string(), "system".to_string());
            } else if !h.is_empty() {
                return ("network.exe".to_string(), h, "generic".to_string());
            } else {
                return ("system.exe".to_string(), "Network Service".to_string(), "generic".to_string());
            }
        }

        match exe_name.as_str() {
            "chrome.exe" => ("chrome.exe".to_string(), "Google Chrome".to_string(), "browser".to_string()),
            "msedge.exe" => ("msedge.exe".to_string(), "Microsoft Edge".to_string(), "browser".to_string()),
            "firefox.exe" => ("firefox.exe".to_string(), "Mozilla Firefox".to_string(), "browser".to_string()),
            "brave.exe" => ("brave.exe".to_string(), "Brave Browser".to_string(), "browser".to_string()),
            "opera.exe" => ("opera.exe".to_string(), "Opera".to_string(), "browser".to_string()),
            "discord.exe" => ("discord.exe".to_string(), "Discord".to_string(), "chat".to_string()),
            "telegram.exe" => ("telegram.exe".to_string(), "Telegram".to_string(), "chat".to_string()),
            "slack.exe" => ("slack.exe".to_string(), "Slack".to_string(), "chat".to_string()),
            "whatsapp.exe" => ("whatsapp.exe".to_string(), "WhatsApp".to_string(), "chat".to_string()),
            "spotify.exe" => ("spotify.exe".to_string(), "Spotify".to_string(), "media".to_string()),
            "steam.exe" | "steamwebhelper.exe" => ("steam.exe".to_string(), "Steam".to_string(), "game".to_string()),
            "epicgameslauncher.exe" => ("epicgameslauncher.exe".to_string(), "Epic Games".to_string(), "game".to_string()),
            "code.exe" => ("code.exe".to_string(), "Visual Studio Code".to_string(), "code".to_string()),
            "cursor.exe" => ("cursor.exe".to_string(), "Cursor".to_string(), "code".to_string()),
            "node.exe" => ("node.exe".to_string(), "Node.js".to_string(), "terminal".to_string()),
            "python.exe" | "python3.exe" => ("python.exe".to_string(), "Python".to_string(), "code".to_string()),
            "git.exe" | "git-remote-https.exe" => ("git.exe".to_string(), "Git".to_string(), "code".to_string()),
            "powershell.exe" | "pwsh.exe" | "cmd.exe" => ("terminal.exe".to_string(), "Terminal".to_string(), "terminal".to_string()),
            "sing-box.exe" | "aether-vpn.exe" => ("aether-vpn.exe".to_string(), "AetherVPN Core".to_string(), "vpn".to_string()),
            other => {
                let pretty_name = other.strip_suffix(".exe").unwrap_or(other);
                let capitalized = pretty_name.chars().enumerate().map(|(i, c)| if i == 0 { c.to_ascii_uppercase() } else { c }).collect::<String>();
                (other.to_string(), capitalized, "generic".to_string())
            }
        }
    }

    pub async fn fetch_clash_traffic(
        port: u16,
        stats: Arc<RwLock<TrafficStats>>,
        app_usages: Arc<RwLock<Vec<AppUsage>>>,
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

                if let Some(conns) = json["connections"].as_array() {
                    let now_iso = chrono::Utc::now().to_rfc3339();
                    let mut current_apps: HashMap<String, (String, String, u64, u64, u32, Vec<String>)> = HashMap::new();

                    for c in conns {
                        let upload = c["upload"].as_u64().unwrap_or(0);
                        let download = c["download"].as_u64().unwrap_or(0);
                        let raw_process = c["metadata"]["process"].as_str().unwrap_or("");
                        let raw_path = c["metadata"]["processPath"].as_str().unwrap_or("");
                        let host = c["metadata"]["host"].as_str()
                            .or_else(|| c["metadata"]["destinationIP"].as_str())
                            .unwrap_or("");

                        let (proc_name, display_name, icon_type) = Self::map_process_info(raw_process, raw_path, host);

                        let entry = current_apps.entry(proc_name).or_insert_with(|| {
                            (display_name, icon_type, 0, 0, 0, Vec::new())
                        });
                        entry.2 += upload;
                        entry.3 += download;
                        entry.4 += 1;
                        if !host.is_empty() && !entry.5.contains(&host.to_string()) && entry.5.len() < 5 {
                            entry.5.push(host.to_string());
                        }
                    }

                    let mut apps_guard = app_usages.write();
                    let prev_map: HashMap<String, (u64, u64)> = apps_guard
                        .iter()
                        .map(|a| (a.process_name.clone(), (a.upload_bytes, a.download_bytes)))
                        .collect();

                    let mut new_list = Vec::new();
                    for (proc_name, (display_name, icon_type, upload, download, active_count, hosts)) in current_apps {
                        let (prev_up, prev_down) = prev_map.get(&proc_name).copied().unwrap_or((0, 0));
                        let up_speed = if upload >= prev_up { upload - prev_up } else { 0 };
                        let down_speed = if download >= prev_down { download - prev_down } else { 0 };

                        new_list.push(AppUsage {
                            process_name: proc_name,
                            display_name,
                            upload_bytes: upload,
                            download_bytes: download,
                            upload_speed_bps: up_speed,
                            download_speed_bps: down_speed,
                            active_connections: active_count,
                            icon_type,
                            destination_hosts: hosts,
                            last_seen: now_iso.clone(),
                        });
                    }

                    new_list.sort_by(|a, b| (b.download_bytes + b.upload_bytes).cmp(&(a.download_bytes + a.upload_bytes)));
                    *apps_guard = new_list;
                }
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
