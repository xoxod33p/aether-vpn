use std::collections::HashMap;
use base64::Engine;
use tracing::info;
use url::Url;

use crate::models::{Profile, Subscription, VpnProtocol};

pub struct SubscriptionParser;

impl SubscriptionParser {
    pub async fn fetch_and_parse(sub: &Subscription) -> Result<Vec<Profile>, String> {
        let parsed_url = Url::parse(&sub.url).map_err(|e| format!("Invalid subscription URL: {}", e))?;
        if parsed_url.scheme() != "http" && parsed_url.scheme() != "https" {
            return Err("Subscription URL must use HTTP or HTTPS protocol".to_string());
        }

        info!("Fetching subscription '{}' from {}", sub.name, sub.url);

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .user_agent("AetherVPN/1.0 (Windows NT 10.0; Win64; x64) sing-box/1.11.4")
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let response = client
            .get(parsed_url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch subscription: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Subscription server returned HTTP error: {}", response.status()));
        }

        let body = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        Self::parse_content(&body, &sub.id, &sub.format)
    }

    pub fn parse_content(content: &str, subscription_id: &str, preferred_format: &str) -> Result<Vec<Profile>, String> {
        let trimmed = content.trim();

        if preferred_format == "singbox" || trimmed.starts_with('{') {
            if let Ok(profiles) = Self::parse_singbox_json(trimmed, subscription_id) {
                if !profiles.is_empty() {
                    return Ok(profiles);
                }
            }
        }

        if preferred_format == "clash" || trimmed.contains("proxies:") {
            if let Ok(profiles) = Self::parse_clash_yaml(trimmed, subscription_id) {
                if !profiles.is_empty() {
                    return Ok(profiles);
                }
            }
        }

        if let Ok(decoded_bytes) = base64::engine::general_purpose::STANDARD.decode(trimmed.replace(['\r', '\n', ' '], "")) {
            if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
                let profiles = Self::parse_share_links(&decoded_str, subscription_id);
                if !profiles.is_empty() {
                    return Ok(profiles);
                }
            }
        }

        let profiles = Self::parse_share_links(trimmed, subscription_id);
        if !profiles.is_empty() {
            return Ok(profiles);
        }

        Err("Unable to parse subscription content: unsupported format or empty server list".to_string())
    }

    pub fn parse_share_links(content: &str, subscription_id: &str) -> Vec<Profile> {
        let mut profiles = Vec::new();

        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            if line.starts_with("vless://") {
                if let Ok(p) = Self::parse_vless_link(line, subscription_id) {
                    profiles.push(p);
                }
            } else if line.starts_with("vmess://") {
                if let Ok(p) = Self::parse_vmess_link(line, subscription_id) {
                    profiles.push(p);
                }
            } else if line.starts_with("trojan://") {
                if let Ok(p) = Self::parse_trojan_link(line, subscription_id) {
                    profiles.push(p);
                }
            } else if line.starts_with("ss://") {
                if let Ok(p) = Self::parse_shadowsocks_link(line, subscription_id) {
                    profiles.push(p);
                }
            }
        }

        profiles
    }

    pub fn parse_vless_link(link: &str, subscription_id: &str) -> Result<Profile, String> {
        let url = Url::parse(link).map_err(|e| format!("Invalid VLESS URL: {}", e))?;
        let host = url.host_str().ok_or("Missing host in VLESS URL")?.to_string();
        let port = url.port().unwrap_or(443);
        let uuid = url.username().to_string();
        if uuid.is_empty() {
            return Err("Missing UUID in VLESS URL".to_string());
        }

        let name = url.fragment().map(|f| urlencoding_decode(f)).unwrap_or_else(|| format!("VLESS {}:{}", host, port));

        let query_pairs: HashMap<String, String> = url.query_pairs().into_owned().collect();
        let security = query_pairs.get("security").cloned().unwrap_or_default();
        let tls_enabled = security == "tls" || security == "reality";
        let server_name = query_pairs.get("sni").cloned().or_else(|| query_pairs.get("peer").cloned());
        let reality_public_key = query_pairs.get("pbk").cloned();
        let reality_short_id = query_pairs.get("sid").cloned();
        let transport_type = query_pairs.get("type").cloned();
        let transport_path = query_pairs.get("path").cloned();
        let transport_host = query_pairs.get("host").cloned();
        let flow = query_pairs.get("flow").cloned();
        let fingerprint = query_pairs.get("fp").cloned();
        let packet_encoding = query_pairs.get("packetEncoding").cloned();
        let alpn = query_pairs.get("alpn").map(|a| a.split(',').map(|s| s.trim().to_string()).collect());

        let id = format!("prof-vless-{}", uuid::Uuid::new_v4().simple());
        let now = chrono::Utc::now().to_rfc3339();

        Ok(Profile {
            id,
            name: name.clone(),
            protocol: VpnProtocol::Vless,
            server: host,
            port,
            username: None,
            password: None,
            uuid: Some(uuid),
            cipher: None,
            tls_enabled: Some(tls_enabled),
            server_name,
            allow_insecure: query_pairs.get("allowInsecure").map(|v| v == "1" || v == "true"),
            alpn,
            reality_public_key,
            reality_short_id,
            transport_type,
            transport_path,
            transport_host,
            flow,
            fingerprint,
            packet_encoding,
            alter_id: None,
            country_code: extract_country_code_from_name(&name),
            group_name: Some("Imported".to_string()),
            subscription_id: Some(subscription_id.to_string()),
            created_at: now.clone(),
            updated_at: now,
            ..Default::default()
        })
    }

    pub fn parse_vmess_link(link: &str, subscription_id: &str) -> Result<Profile, String> {
        let b64 = link.trim_start_matches("vmess://");
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(b64)
            .map_err(|e| format!("Failed to decode VMess base64: {}", e))?;
        let json_str = String::from_utf8(decoded).map_err(|e| format!("Invalid UTF-8 in VMess JSON: {}", e))?;

        let v: serde_json::Value = serde_json::from_str(&json_str).map_err(|e| format!("Invalid VMess JSON: {}", e))?;

        let name = v["ps"].as_str().unwrap_or("VMess Server").to_string();
        let host = v["add"].as_str().ok_or("Missing add field in VMess JSON")?.to_string();
        let port = match &v["port"] {
            serde_json::Value::Number(n) => n.as_u64().unwrap_or(443) as u16,
            serde_json::Value::String(s) => s.parse::<u16>().unwrap_or(443),
            _ => 443,
        };
        let uuid = v["id"].as_str().ok_or("Missing id in VMess JSON")?.to_string();
        let tls = v["tls"].as_str().map(|t| t == "tls" || t == "1").unwrap_or(false);
        let sni = v["sni"].as_str().or_else(|| v["host"].as_str()).map(String::from);
        let net = v["net"].as_str().map(String::from);
        let path = v["path"].as_str().map(String::from);
        let transport_host = v["host"].as_str().map(String::from);
        let fingerprint = v["fp"].as_str().map(String::from);
        let alter_id = match &v["aid"] {
            serde_json::Value::Number(n) => n.as_u64().map(|val| val as u32),
            serde_json::Value::String(s) => s.parse::<u32>().ok(),
            _ => None,
        };
        let cipher = v["scy"].as_str().or_else(|| v["security"].as_str()).map(String::from).or_else(|| Some("auto".to_string()));
        let alpn = v["alpn"].as_str().map(|a| a.split(',').map(|s| s.trim().to_string()).collect());

        let id = format!("prof-vmess-{}", uuid::Uuid::new_v4().simple());
        let now = chrono::Utc::now().to_rfc3339();

        Ok(Profile {
            id,
            name: name.clone(),
            protocol: VpnProtocol::Vmess,
            server: host,
            port,
            username: None,
            password: None,
            uuid: Some(uuid),
            cipher,
            tls_enabled: Some(tls),
            server_name: sni,
            allow_insecure: Some(false),
            alpn,
            reality_public_key: None,
            reality_short_id: None,
            transport_type: net,
            transport_path: path,
            transport_host,
            flow: None,
            fingerprint,
            packet_encoding: Some("xudp".to_string()),
            alter_id,
            country_code: extract_country_code_from_name(&name),
            group_name: Some("Imported".to_string()),
            subscription_id: Some(subscription_id.to_string()),
            created_at: now.clone(),
            updated_at: now,
            ..Default::default()
        })
    }

    pub fn parse_trojan_link(link: &str, subscription_id: &str) -> Result<Profile, String> {
        let url = Url::parse(link).map_err(|e| format!("Invalid Trojan URL: {}", e))?;
        let host = url.host_str().ok_or("Missing host in Trojan URL")?.to_string();
        let port = url.port().unwrap_or(443);
        let password = url.username().to_string();
        if password.is_empty() {
            return Err("Missing password in Trojan URL".to_string());
        }

        let name = url.fragment().map(|f| urlencoding_decode(f)).unwrap_or_else(|| format!("Trojan {}:{}", host, port));
        let query_pairs: HashMap<String, String> = url.query_pairs().into_owned().collect();
        let server_name = query_pairs.get("sni").cloned().or_else(|| query_pairs.get("peer").cloned());
        let transport_host = query_pairs.get("host").cloned();
        let fingerprint = query_pairs.get("fp").cloned();
        let alpn = query_pairs.get("alpn").map(|a| a.split(',').map(|s| s.trim().to_string()).collect());

        let id = format!("prof-trojan-{}", uuid::Uuid::new_v4().simple());
        let now = chrono::Utc::now().to_rfc3339();

        Ok(Profile {
            id,
            name: name.clone(),
            protocol: VpnProtocol::Trojan,
            server: host,
            port,
            username: None,
            password: Some(password),
            uuid: None,
            cipher: None,
            tls_enabled: Some(true),
            server_name,
            allow_insecure: query_pairs.get("allowInsecure").map(|v| v == "1" || v == "true"),
            alpn,
            reality_public_key: None,
            reality_short_id: None,
            transport_type: query_pairs.get("type").cloned(),
            transport_path: query_pairs.get("path").cloned(),
            transport_host,
            flow: None,
            fingerprint,
            packet_encoding: None,
            alter_id: None,
            country_code: extract_country_code_from_name(&name),
            group_name: Some("Imported".to_string()),
            subscription_id: Some(subscription_id.to_string()),
            created_at: now.clone(),
            updated_at: now,
            ..Default::default()
        })
    }

    pub fn parse_shadowsocks_link(link: &str, subscription_id: &str) -> Result<Profile, String> {
        let raw = link.trim_start_matches("ss://");
        let (main_part, tag) = match raw.split_once('#') {
            Some((m, t)) => (m, Some(urlencoding_decode(t))),
            None => (raw, None),
        };

        let mut cipher = "aes-256-gcm".to_string();
        let mut password = "".to_string();
        let mut host = "".to_string();
        let mut port = 8388;

        if let Ok(decoded_bytes) = base64::engine::general_purpose::STANDARD.decode(main_part) {
            if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
                if let Some((userinfo, hostport)) = decoded_str.split_once('@') {
                    if let Some((c, p)) = userinfo.split_once(':') {
                        cipher = c.to_string();
                        password = p.to_string();
                    }
                    if let Some((h, pt)) = hostport.split_once(':') {
                        host = h.to_string();
                        port = pt.parse::<u16>().unwrap_or(8388);
                    }
                }
            }
        }

        if host.is_empty() {
            if let Some((b64_userinfo, hostport)) = main_part.split_once('@') {
                if let Ok(decoded_bytes) = base64::engine::general_purpose::STANDARD.decode(b64_userinfo) {
                    if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
                        if let Some((c, p)) = decoded_str.split_once(':') {
                            cipher = c.to_string();
                            password = p.to_string();
                        }
                    }
                }
                if let Some((h, pt)) = hostport.split_once(':') {
                    host = h.to_string();
                    port = pt.split('?').next().unwrap_or("8388").parse::<u16>().unwrap_or(8388);
                }
            }
        }

        if host.is_empty() {
            return Err("Unable to parse Shadowsocks link structure".to_string());
        }

        let name = tag.unwrap_or_else(|| format!("Shadowsocks {}:{}", host, port));
        let id = format!("prof-ss-{}", uuid::Uuid::new_v4().simple());
        let now = chrono::Utc::now().to_rfc3339();

        Ok(Profile {
            id,
            name: name.clone(),
            protocol: VpnProtocol::Shadowsocks,
            server: host,
            port,
            username: None,
            password: Some(password),
            uuid: None,
            cipher: Some(cipher),
            tls_enabled: None,
            server_name: None,
            allow_insecure: None,
            alpn: None,
            reality_public_key: None,
            reality_short_id: None,
            transport_type: None,
            transport_path: None,
            country_code: extract_country_code_from_name(&name),
            group_name: Some("Imported".to_string()),
            subscription_id: Some(subscription_id.to_string()),
            created_at: now.clone(),
            updated_at: now,
            ..Default::default()
        })
    }

    pub fn parse_singbox_json(json_str: &str, subscription_id: &str) -> Result<Vec<Profile>, String> {
        let root: serde_json::Value = serde_json::from_str(json_str)
            .map_err(|e| format!("Invalid sing-box JSON: {}", e))?;

        let outbounds = root.get("outbounds")
            .and_then(|o| o.as_array())
            .ok_or("sing-box configuration missing 'outbounds' array")?;

        let mut profiles = Vec::new();
        let now = chrono::Utc::now().to_rfc3339();

        for out in outbounds {
            let out_type = out.get("type").and_then(|t| t.as_str()).unwrap_or_default();
            let tag = out.get("tag").and_then(|t| t.as_str()).unwrap_or("sing-box Node");
            let server = out.get("server").and_then(|s| s.as_str()).unwrap_or_default();
            let port = out.get("server_port").and_then(|p| p.as_u64()).unwrap_or(0) as u16;

            if server.is_empty() || port == 0 {
                continue;
            }

            let profile_opt = match out_type {
                "vless" => {
                    let uuid = out.get("uuid").and_then(|u| u.as_str()).map(String::from);
                    let tls = out.get("tls").map(|t| t.get("enabled").and_then(|e| e.as_bool()).unwrap_or(false));
                    let sni = out.get("tls").and_then(|t| t.get("server_name").and_then(|s| s.as_str())).map(String::from);
                    let reality_pbk = out.get("tls").and_then(|t| t.get("reality").and_then(|r| r.get("public_key").and_then(|k| k.as_str()))).map(String::from);
                    let reality_sid = out.get("tls").and_then(|t| t.get("reality").and_then(|r| r.get("short_id").and_then(|s| s.as_str()))).map(String::from);
                    let transport_type = out.get("transport").and_then(|t| t.get("type").and_then(|s| s.as_str())).map(String::from);
                    let transport_path = out.get("transport").and_then(|t| t.get("path").and_then(|s| s.as_str())).map(String::from);

                    Some(Profile {
                        id: format!("prof-vless-{}", uuid::Uuid::new_v4().simple()),
                        name: tag.to_string(),
                        protocol: VpnProtocol::Vless,
                        server: server.to_string(),
                        port,
                        username: None,
                        password: None,
                        uuid,
                        cipher: None,
                        tls_enabled: tls,
                        server_name: sni,
                        allow_insecure: Some(false),
                        alpn: None,
                        reality_public_key: reality_pbk,
                        reality_short_id: reality_sid,
                        transport_type,
                        transport_path,
                        country_code: extract_country_code_from_name(tag),
                        group_name: Some("sing-box".to_string()),
                        subscription_id: Some(subscription_id.to_string()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..Default::default()
                    })
                }
                "shadowsocks" => {
                    let method = out.get("method").and_then(|m| m.as_str()).map(String::from);
                    let password = out.get("password").and_then(|p| p.as_str()).map(String::from);

                    Some(Profile {
                        id: format!("prof-ss-{}", uuid::Uuid::new_v4().simple()),
                        name: tag.to_string(),
                        protocol: VpnProtocol::Shadowsocks,
                        server: server.to_string(),
                        port,
                        username: None,
                        password,
                        uuid: None,
                        cipher: method,
                        tls_enabled: None,
                        server_name: None,
                        allow_insecure: None,
                        alpn: None,
                        reality_public_key: None,
                        reality_short_id: None,
                        transport_type: None,
                        transport_path: None,
                        country_code: extract_country_code_from_name(tag),
                        group_name: Some("sing-box".to_string()),
                        subscription_id: Some(subscription_id.to_string()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..Default::default()
                    })
                }
                "wireguard" => {
                    let private_key = out.get("private_key").and_then(|k| k.as_str()).map(String::from);
                    let peer_public_key = out.get("peer_public_key").and_then(|k| k.as_str()).map(String::from);
                    let address = out.get("local_address").and_then(|a| a.as_array()).and_then(|arr| arr.first()).and_then(|v| v.as_str()).map(String::from);

                    Some(Profile {
                        id: format!("prof-wg-{}", uuid::Uuid::new_v4().simple()),
                        name: tag.to_string(),
                        protocol: VpnProtocol::Wireguard,
                        server: server.to_string(),
                        port,
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
                        wg_private_key: private_key,
                        wg_public_key: peer_public_key,
                        wg_address: address,
                        wg_dns: Some("1.1.1.1".to_string()),
                        wg_mtu: Some(1420),
                        country_code: extract_country_code_from_name(tag),
                        group_name: Some("sing-box".to_string()),
                        subscription_id: Some(subscription_id.to_string()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..Default::default()
                    })
                }
                _ => None,
            };

            if let Some(p) = profile_opt {
                profiles.push(p);
            }
        }

        Ok(profiles)
    }

    pub fn parse_clash_yaml(yaml_str: &str, subscription_id: &str) -> Result<Vec<Profile>, String> {
        let value: serde_yaml::Value = serde_yaml::from_str(yaml_str)
            .map_err(|e| format!("Invalid Clash YAML: {}", e))?;

        let proxies = value.get("proxies")
            .and_then(|p| p.as_sequence())
            .ok_or("Clash YAML missing 'proxies' section")?;

        let mut profiles = Vec::new();
        let now = chrono::Utc::now().to_rfc3339();

        for p in proxies {
            let name = p.get("name").and_then(|n| n.as_str()).unwrap_or("Clash Node");
            let p_type = p.get("type").and_then(|t| t.as_str()).unwrap_or_default();
            let server = p.get("server").and_then(|s| s.as_str()).unwrap_or_default();
            let port = p.get("port").and_then(|pt| pt.as_u64()).unwrap_or(0) as u16;

            if server.is_empty() || port == 0 {
                continue;
            }

            let profile_opt = match p_type {
                "ss" => {
                    let cipher = p.get("cipher").and_then(|c| c.as_str()).map(String::from);
                    let password = p.get("password").and_then(|pw| pw.as_str()).map(String::from);
                    Some(Profile {
                        id: format!("prof-ss-{}", uuid::Uuid::new_v4().simple()),
                        name: name.to_string(),
                        protocol: VpnProtocol::Shadowsocks,
                        server: server.to_string(),
                        port,
                        username: None,
                        password,
                        uuid: None,
                        cipher,
                        tls_enabled: None,
                        server_name: None,
                        allow_insecure: None,
                        alpn: None,
                        reality_public_key: None,
                        reality_short_id: None,
                        transport_type: None,
                        transport_path: None,
                        country_code: extract_country_code_from_name(name),
                        group_name: Some("Clash".to_string()),
                        subscription_id: Some(subscription_id.to_string()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..Default::default()
                    })
                }
                "vless" => {
                    let uuid = p.get("uuid").and_then(|u| u.as_str()).map(String::from);
                    let tls = p.get("tls").and_then(|t| t.as_bool());
                    let sni = p.get("servername").or_else(|| p.get("sni")).and_then(|s| s.as_str()).map(String::from);

                    Some(Profile {
                        id: format!("prof-vless-{}", uuid::Uuid::new_v4().simple()),
                        name: name.to_string(),
                        protocol: VpnProtocol::Vless,
                        server: server.to_string(),
                        port,
                        username: None,
                        password: None,
                        uuid,
                        cipher: None,
                        tls_enabled: tls,
                        server_name: sni,
                        allow_insecure: Some(false),
                        alpn: None,
                        reality_public_key: None,
                        reality_short_id: None,
                        transport_type: p.get("network").and_then(|n| n.as_str()).map(String::from),
                        transport_path: p.get("ws-opts").and_then(|w| w.get("path")).and_then(|pt| pt.as_str()).map(String::from),
                        country_code: extract_country_code_from_name(name),
                        group_name: Some("Clash".to_string()),
                        subscription_id: Some(subscription_id.to_string()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..Default::default()
                    })
                }
                "trojan" => {
                    let password = p.get("password").and_then(|pw| pw.as_str()).map(String::from);
                    let sni = p.get("sni").and_then(|s| s.as_str()).map(String::from);

                    Some(Profile {
                        id: format!("prof-trojan-{}", uuid::Uuid::new_v4().simple()),
                        name: name.to_string(),
                        protocol: VpnProtocol::Trojan,
                        server: server.to_string(),
                        port,
                        username: None,
                        password,
                        uuid: None,
                        cipher: None,
                        tls_enabled: Some(true),
                        server_name: sni,
                        allow_insecure: Some(false),
                        alpn: None,
                        reality_public_key: None,
                        reality_short_id: None,
                        transport_type: None,
                        transport_path: None,
                        country_code: extract_country_code_from_name(name),
                        group_name: Some("Clash".to_string()),
                        subscription_id: Some(subscription_id.to_string()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                        ..Default::default()
                    })
                }
                _ => None,
            };

            if let Some(prof) = profile_opt {
                profiles.push(prof);
            }
        }

        Ok(profiles)
    }

    pub fn export_profile_link(profile: &Profile) -> Result<String, String> {
        let name_encoded = url::form_urlencoded::byte_serialize(profile.name.as_bytes()).collect::<String>();
        match profile.protocol {
            VpnProtocol::Vless => {
                let uuid = profile.uuid.as_deref().unwrap_or_default();
                if uuid.is_empty() {
                    return Err("Missing UUID for VLESS configuration".to_string());
                }
                let mut params = Vec::new();
                if profile.reality_public_key.is_some() {
                    params.push("security=reality".to_string());
                    if let Some(pbk) = &profile.reality_public_key {
                        params.push(format!("pbk={}", url::form_urlencoded::byte_serialize(pbk.as_bytes()).collect::<String>()));
                    }
                    if let Some(sid) = &profile.reality_short_id {
                        params.push(format!("sid={}", url::form_urlencoded::byte_serialize(sid.as_bytes()).collect::<String>()));
                    }
                } else if profile.tls_enabled.unwrap_or(false) {
                    params.push("security=tls".to_string());
                } else {
                    params.push("security=none".to_string());
                }

                if let Some(sni) = &profile.server_name {
                    if !sni.is_empty() {
                        params.push(format!("sni={}", url::form_urlencoded::byte_serialize(sni.as_bytes()).collect::<String>()));
                    }
                }
                if let Some(tt) = &profile.transport_type {
                    params.push(format!("type={}", url::form_urlencoded::byte_serialize(tt.as_bytes()).collect::<String>()));
                }
                if let Some(host) = &profile.transport_host {
                    if !host.is_empty() {
                        params.push(format!("host={}", url::form_urlencoded::byte_serialize(host.as_bytes()).collect::<String>()));
                    }
                }
                if let Some(path) = &profile.transport_path {
                    if !path.is_empty() {
                        params.push(format!("path={}", url::form_urlencoded::byte_serialize(path.as_bytes()).collect::<String>()));
                    }
                }
                if let Some(flow) = &profile.flow {
                    if !flow.is_empty() {
                        params.push(format!("flow={}", url::form_urlencoded::byte_serialize(flow.as_bytes()).collect::<String>()));
                    }
                }
                if let Some(fp) = &profile.fingerprint {
                    if !fp.is_empty() {
                        params.push(format!("fp={}", url::form_urlencoded::byte_serialize(fp.as_bytes()).collect::<String>()));
                    }
                }

                let query = if params.is_empty() {
                    String::new()
                } else {
                    format!("?{}", params.join("&"))
                };
                Ok(format!("vless://{}@{}:{}{}#{}", uuid, profile.server, profile.port, query, name_encoded))
            }
            VpnProtocol::Vmess => {
                let uuid = profile.uuid.as_deref().unwrap_or_default();
                if uuid.is_empty() {
                    return Err("Missing UUID for VMess configuration".to_string());
                }
                let vmess_json = serde_json::json!({
                    "v": "2",
                    "ps": profile.name,
                    "add": profile.server,
                    "port": profile.port,
                    "id": uuid,
                    "aid": profile.alter_id.unwrap_or(0),
                    "scy": profile.cipher.as_deref().unwrap_or("auto"),
                    "net": profile.transport_type.as_deref().unwrap_or("tcp"),
                    "type": "none",
                    "host": profile.transport_host.as_deref().unwrap_or(""),
                    "path": profile.transport_path.as_deref().unwrap_or(""),
                    "tls": if profile.tls_enabled.unwrap_or(false) { "tls" } else { "" },
                    "sni": profile.server_name.as_deref().unwrap_or("")
                });
                let encoded = base64::engine::general_purpose::STANDARD.encode(vmess_json.to_string());
                Ok(format!("vmess://{}", encoded))
            }
            VpnProtocol::Trojan => {
                let password = profile.password.as_deref().unwrap_or_default();
                if password.is_empty() {
                    return Err("Missing password for Trojan configuration".to_string());
                }
                let mut params = Vec::new();
                if profile.tls_enabled.unwrap_or(true) {
                    params.push("security=tls".to_string());
                }
                if let Some(sni) = &profile.server_name {
                    if !sni.is_empty() {
                        params.push(format!("sni={}", url::form_urlencoded::byte_serialize(sni.as_bytes()).collect::<String>()));
                    }
                }
                if let Some(tt) = &profile.transport_type {
                    params.push(format!("type={}", url::form_urlencoded::byte_serialize(tt.as_bytes()).collect::<String>()));
                }
                if let Some(host) = &profile.transport_host {
                    if !host.is_empty() {
                        params.push(format!("host={}", url::form_urlencoded::byte_serialize(host.as_bytes()).collect::<String>()));
                    }
                }
                if let Some(path) = &profile.transport_path {
                    if !path.is_empty() {
                        params.push(format!("path={}", url::form_urlencoded::byte_serialize(path.as_bytes()).collect::<String>()));
                    }
                }
                let query = if params.is_empty() {
                    String::new()
                } else {
                    format!("?{}", params.join("&"))
                };
                Ok(format!("trojan://{}@{}:{}{}#{}", password, profile.server, profile.port, query, name_encoded))
            }
            VpnProtocol::Shadowsocks => {
                let method = profile.cipher.as_deref().unwrap_or("chacha20-ietf-poly1305");
                let password = profile.password.as_deref().unwrap_or_default();
                let user_info = format!("{}:{}", method, password);
                let encoded_user_info = base64::engine::general_purpose::STANDARD.encode(user_info);
                Ok(format!("ss://{}@{}:{}#{}", encoded_user_info, profile.server, profile.port, name_encoded))
            }
            VpnProtocol::Hysteria2 => {
                let password = profile.password.as_deref().unwrap_or_default();
                let mut params = Vec::new();
                if let Some(sni) = &profile.server_name {
                    if !sni.is_empty() {
                        params.push(format!("sni={}", url::form_urlencoded::byte_serialize(sni.as_bytes()).collect::<String>()));
                    }
                }
                params.push("insecure=0".to_string());
                let query = format!("?{}", params.join("&"));
                Ok(format!("hysteria2://{}@{}:{}{}#{}", password, profile.server, profile.port, query, name_encoded))
            }
            VpnProtocol::Wireguard => {
                let json_data = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
                Ok(json_data)
            }
            VpnProtocol::Socks5 => {
                let user_info = if let Some(user) = &profile.username {
                    let pass = profile.password.as_deref().unwrap_or_default();
                    format!("{}:{}@", user, pass)
                } else {
                    String::new()
                };
                Ok(format!("socks5://{}{}:{}#{}", user_info, profile.server, profile.port, name_encoded))
            }
        }
    }
}

fn urlencoding_decode(val: &str) -> String {
    urlencoding_decode_lossy(val)
}

fn urlencoding_decode_lossy(val: &str) -> String {
    let mut result = String::new();
    let mut chars = val.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if hex.len() == 2 {
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    result.push(byte as char);
                    continue;
                }
            }
            result.push('%');
            result.push_str(&hex);
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}

fn extract_country_code_from_name(name: &str) -> Option<String> {
    let upper = name.to_uppercase();

    let country_pairs = [
        ("US", "US"), ("UNITED STATES", "US"), ("AMERICA", "US"),
        ("DE", "DE"), ("GERMANY", "DE"), ("FRANKFURT", "DE"),
        ("GB", "GB"), ("UK", "GB"), ("LONDON", "GB"), ("ENGLAND", "GB"),
        ("JP", "JP"), ("JAPAN", "JP"), ("TOKYO", "JP"),
        ("SG", "SG"), ("SINGAPORE", "SG"),
        ("NL", "NL"), ("NETHERLANDS", "NL"), ("AMSTERDAM", "NL"),
        ("CA", "CA"), ("CANADA", "CA"),
        ("FR", "FR"), ("FRANCE", "FR"), ("PARIS", "FR"),
        ("AU", "AU"), ("AUSTRALIA", "AU"), ("SYDNEY", "AU"),
        ("KR", "KR"), ("KOREA", "KR"), ("SEOUL", "KR"),
        ("HK", "HK"), ("HONG KONG", "HK"),
        ("CH", "CH"), ("SWITZERLAND", "CH"),
        ("SE", "SE"), ("SWEDEN", "SE"),
    ];

    for (needle, code) in country_pairs {
        if upper.contains(&format!("[{}]", needle))
            || upper.contains(&format!(" {} ", needle))
            || upper.starts_with(&format!("{}-", needle))
            || upper.starts_with(&format!("{} ", needle))
            || upper.contains(needle)
        {
            return Some(code.to_string());
        }
    }

    None
}
