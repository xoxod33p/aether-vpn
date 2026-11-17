use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::Mutex;
use rusqlite::{params, Connection, Result};
use tracing::info;

use crate::models::{
    Profile, VpnProtocol, AppSettings, DnsConfig, OperatingMode,
    Subscription, RoutingRule, RoutingAction, RoutingRuleType,
};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(db_path: Option<PathBuf>) -> Result<Self> {
        let path = match db_path {
            Some(p) => p,
            None => {
                let dir = dirs::data_local_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join("AetherVPN");
                let _ = std::fs::create_dir_all(&dir);
                dir.join("aether.db")
            }
        };

        info!("Opening AetherVPN database at: {:?}", path);
        let conn = Connection::open(&path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };

        db.migrate()?;
        db.seed_defaults_if_empty()?;
        Ok(db)
    }

    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.migrate()?;
        db.seed_defaults_if_empty()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.conn.lock();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                protocol TEXT NOT NULL,
                server TEXT NOT NULL,
                port INTEGER NOT NULL,
                username TEXT,
                password TEXT,
                uuid TEXT,
                cipher TEXT,
                tls_enabled INTEGER,
                server_name TEXT,
                allow_insecure INTEGER,
                reality_public_key TEXT,
                reality_short_id TEXT,
                transport_type TEXT,
                transport_path TEXT,
                transport_host TEXT,
                flow TEXT,
                fingerprint TEXT,
                packet_encoding TEXT,
                alpn TEXT,
                alter_id INTEGER,
                wg_private_key TEXT,
                wg_public_key TEXT,
                wg_address TEXT,
                wg_dns TEXT,
                wg_mtu INTEGER,
                country_code TEXT,
                group_name TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                latency_ms INTEGER,
                last_tested_at TEXT,
                subscription_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                format TEXT NOT NULL,
                auto_update INTEGER NOT NULL DEFAULT 1,
                update_interval_hours INTEGER NOT NULL DEFAULT 24,
                last_updated_at TEXT,
                last_status TEXT NOT NULL DEFAULT 'idle',
                profile_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS routing_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                rule_type TEXT NOT NULL,
                rule_value TEXT NOT NULL,
                action TEXT NOT NULL,
                priority INTEGER NOT NULL,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                theme TEXT NOT NULL DEFAULT 'dark',
                language TEXT NOT NULL DEFAULT 'en-US',
                start_on_boot INTEGER NOT NULL DEFAULT 0,
                minimize_to_tray INTEGER NOT NULL DEFAULT 1,
                start_minimized INTEGER NOT NULL DEFAULT 0,
                default_mode TEXT NOT NULL DEFAULT 'tun',
                auto_reconnect INTEGER NOT NULL DEFAULT 1,
                connection_timeout_secs INTEGER NOT NULL DEFAULT 15,
                kill_switch_enabled INTEGER NOT NULL DEFAULT 0,
                dns_leak_protection INTEGER NOT NULL DEFAULT 1,
                mtu INTEGER NOT NULL DEFAULT 9000,
                enable_ipv6 INTEGER NOT NULL DEFAULT 0,
                socks_port INTEGER NOT NULL DEFAULT 2080,
                http_port INTEGER NOT NULL DEFAULT 2081,
                clash_api_port INTEGER NOT NULL DEFAULT 9090
            );

            CREATE TABLE IF NOT EXISTS dns_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                provider_type TEXT NOT NULL DEFAULT 'doh',
                primary_dns TEXT NOT NULL DEFAULT 'https://1.1.1.1/dns-query',
                fallback_dns TEXT NOT NULL DEFAULT 'https://8.8.8.8/dns-query',
                enable_dns_routing INTEGER NOT NULL DEFAULT 1,
                prevent_leak INTEGER NOT NULL DEFAULT 1
            );
            ",
        )?;

        // Ensure columns exist on pre-existing databases
        let _ = conn.execute("ALTER TABLE profiles ADD COLUMN transport_host TEXT", []);
        let _ = conn.execute("ALTER TABLE profiles ADD COLUMN flow TEXT", []);
        let _ = conn.execute("ALTER TABLE profiles ADD COLUMN fingerprint TEXT", []);
        let _ = conn.execute("ALTER TABLE profiles ADD COLUMN packet_encoding TEXT", []);
        let _ = conn.execute("ALTER TABLE profiles ADD COLUMN alpn TEXT", []);
        let _ = conn.execute("ALTER TABLE profiles ADD COLUMN alter_id INTEGER", []);

        Ok(())
    }

    fn seed_defaults_if_empty(&self) -> Result<()> {
        let conn = self.conn.lock();

        // Seed App Settings
        let settings_count: i64 = conn.query_row("SELECT COUNT(*) FROM app_settings", [], |r| r.get(0))?;
        if settings_count == 0 {
            conn.execute(
                "INSERT INTO app_settings (
                    id, theme, language, start_on_boot, minimize_to_tray, start_minimized,
                    default_mode, auto_reconnect, connection_timeout_secs, kill_switch_enabled,
                    dns_leak_protection, mtu, enable_ipv6, socks_port, http_port, clash_api_port
                ) VALUES (1, 'dark', 'en-US', 0, 1, 0, 'tun', 1, 15, 0, 1, 9000, 0, 2080, 2081, 9090)",
                [],
            )?;
        }

        // Seed DNS Settings (Standard Privacy DNS)
        let dns_count: i64 = conn.query_row("SELECT COUNT(*) FROM dns_settings", [], |r| r.get(0))?;
        if dns_count == 0 {
            conn.execute(
                "INSERT INTO dns_settings (
                    id, provider_type, primary_dns, fallback_dns, enable_dns_routing, prevent_leak
                ) VALUES (1, 'doh', 'https://1.1.1.1/dns-query', 'https://8.8.8.8/dns-query', 1, 1)",
                [],
            )?;
        }

        // Seed Standard Routing Rules (RFC1918 Private CIDRs & Localhost Bypass)
        let rules_count: i64 = conn.query_row("SELECT COUNT(*) FROM routing_rules", [], |r| r.get(0))?;
        if rules_count == 0 {
            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO routing_rules (id, name, rule_type, rule_value, action, priority, is_enabled, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params!["rule-1", "Bypass LAN & Private IPs", "ip_cidr", "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.0/8", "direct", 10, 1, &now],
            )?;
            conn.execute(
                "INSERT INTO routing_rules (id, name, rule_type, rule_value, action, priority, is_enabled, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params!["rule-2", "Block Common Trackers & Ads", "domain_suffix", "doubleclick.net,google-analytics.com,telemetry.microsoft.com", "block", 20, 1, &now],
            )?;
            conn.execute(
                "INSERT INTO routing_rules (id, name, rule_type, rule_value, action, priority, is_enabled, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params!["rule-3", "Direct Local Domains", "domain_suffix", "localhost,local,lan", "direct", 30, 1, &now],
            )?;
        }

        Ok(())
    }

    // --- Profiles CRUD ---

    pub fn get_profiles(&self) -> Result<Vec<Profile>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, name, protocol, server, port, username, password, uuid, cipher,
                    tls_enabled, server_name, allow_insecure, reality_public_key, reality_short_id,
                    transport_type, transport_path, wg_private_key, wg_public_key, wg_address,
                    wg_dns, wg_mtu, country_code, group_name, is_favorite, latency_ms,
                    last_tested_at, subscription_id, created_at, updated_at,
                    transport_host, flow, fingerprint, packet_encoding, alpn, alter_id
             FROM profiles ORDER BY is_favorite DESC, latency_ms ASC NULLS LAST, name ASC",
        )?;

        let profile_iter = stmt.query_map([], |row| {
            let proto_str: String = row.get(2)?;
            let protocol = match proto_str.as_str() {
                "socks5" => VpnProtocol::Socks5,
                "shadowsocks" => VpnProtocol::Shadowsocks,
                "vless" => VpnProtocol::Vless,
                "trojan" => VpnProtocol::Trojan,
                "wireguard" => VpnProtocol::Wireguard,
                "vmess" => VpnProtocol::Vmess,
                "hysteria2" => VpnProtocol::Hysteria2,
                _ => VpnProtocol::Vless,
            };

            let alpn_raw: Option<String> = row.get(33)?;
            let alpn = alpn_raw.map(|s| {
                s.split(',')
                    .map(|item| item.trim().to_string())
                    .filter(|item| !item.is_empty())
                    .collect()
            });

            Ok(Profile {
                id: row.get(0)?,
                name: row.get(1)?,
                protocol,
                server: row.get(3)?,
                port: row.get(4)?,
                username: row.get(5)?,
                password: row.get(6)?,
                uuid: row.get(7)?,
                cipher: row.get(8)?,
                tls_enabled: row.get::<_, Option<i32>>(9)?.map(|v| v != 0),
                server_name: row.get(10)?,
                allow_insecure: row.get::<_, Option<i32>>(11)?.map(|v| v != 0),
                alpn,
                reality_public_key: row.get(12)?,
                reality_short_id: row.get(13)?,
                transport_type: row.get(14)?,
                transport_path: row.get(15)?,
                wg_private_key: row.get(16)?,
                wg_public_key: row.get(17)?,
                wg_address: row.get(18)?,
                wg_dns: row.get(19)?,
                wg_mtu: row.get(20)?,
                country_code: row.get(21)?,
                group_name: row.get(22)?,
                is_favorite: row.get::<_, i32>(23)? != 0,
                latency_ms: row.get(24)?,
                last_tested_at: row.get(25)?,
                subscription_id: row.get(26)?,
                created_at: row.get(27)?,
                updated_at: row.get(28)?,
                transport_host: row.get(29)?,
                flow: row.get(30)?,
                fingerprint: row.get(31)?,
                packet_encoding: row.get(32)?,
                alter_id: row.get(34)?,
            })
        })?;

        let mut profiles = Vec::new();
        for p in profile_iter {
            profiles.push(p?);
        }
        Ok(profiles)
    }

    pub fn get_profile(&self, id: &str) -> Result<Option<Profile>> {
        let profiles = self.get_profiles()?;
        Ok(profiles.into_iter().find(|p| p.id == id))
    }

    pub fn save_profile(&self, p: &Profile) -> Result<()> {
        let conn = self.conn.lock();
        let proto_str = match p.protocol {
            VpnProtocol::Socks5 => "socks5",
            VpnProtocol::Shadowsocks => "shadowsocks",
            VpnProtocol::Vless => "vless",
            VpnProtocol::Trojan => "trojan",
            VpnProtocol::Wireguard => "wireguard",
            VpnProtocol::Vmess => "vmess",
            VpnProtocol::Hysteria2 => "hysteria2",
        };

        let alpn_str = p.alpn.as_ref().map(|list| list.join(","));

        conn.execute(
            "INSERT INTO profiles (
                id, name, protocol, server, port, username, password, uuid, cipher,
                tls_enabled, server_name, allow_insecure, reality_public_key, reality_short_id,
                transport_type, transport_path, wg_private_key, wg_public_key, wg_address,
                wg_dns, wg_mtu, country_code, group_name, is_favorite, latency_ms,
                last_tested_at, subscription_id, created_at, updated_at,
                transport_host, flow, fingerprint, packet_encoding, alpn, alter_id
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
                ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29,
                ?30, ?31, ?32, ?33, ?34, ?35
            ) ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                protocol = excluded.protocol,
                server = excluded.server,
                port = excluded.port,
                username = excluded.username,
                password = excluded.password,
                uuid = excluded.uuid,
                cipher = excluded.cipher,
                tls_enabled = excluded.tls_enabled,
                server_name = excluded.server_name,
                allow_insecure = excluded.allow_insecure,
                reality_public_key = excluded.reality_public_key,
                reality_short_id = excluded.reality_short_id,
                transport_type = excluded.transport_type,
                transport_path = excluded.transport_path,
                wg_private_key = excluded.wg_private_key,
                wg_public_key = excluded.wg_public_key,
                wg_address = excluded.wg_address,
                wg_dns = excluded.wg_dns,
                wg_mtu = excluded.wg_mtu,
                country_code = excluded.country_code,
                group_name = excluded.group_name,
                is_favorite = excluded.is_favorite,
                latency_ms = excluded.latency_ms,
                last_tested_at = excluded.last_tested_at,
                subscription_id = excluded.subscription_id,
                updated_at = excluded.updated_at,
                transport_host = excluded.transport_host,
                flow = excluded.flow,
                fingerprint = excluded.fingerprint,
                packet_encoding = excluded.packet_encoding,
                alpn = excluded.alpn,
                alter_id = excluded.alter_id",
            params![
                p.id,
                p.name,
                proto_str,
                p.server,
                p.port,
                p.username,
                p.password,
                p.uuid,
                p.cipher,
                p.tls_enabled.map(|v| if v { 1 } else { 0 }),
                p.server_name,
                p.allow_insecure.map(|v| if v { 1 } else { 0 }),
                p.reality_public_key,
                p.reality_short_id,
                p.transport_type,
                p.transport_path,
                p.wg_private_key,
                p.wg_public_key,
                p.wg_address,
                p.wg_dns,
                p.wg_mtu,
                p.country_code,
                p.group_name,
                if p.is_favorite { 1 } else { 0 },
                p.latency_ms,
                p.last_tested_at,
                p.subscription_id,
                p.created_at,
                p.updated_at,
                p.transport_host,
                p.flow,
                p.fingerprint,
                p.packet_encoding,
                alpn_str,
                p.alter_id
            ],
        )?;
        Ok(())
    }

    pub fn delete_profile(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn delete_profiles_by_subscription(&self, sub_id: &str) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM profiles WHERE subscription_id = ?1", params![sub_id])?;
        Ok(())
    }

    pub fn update_profile_latency(&self, id: &str, latency_ms: u32, tested_at: &str) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE profiles SET latency_ms = ?1, last_tested_at = ?2 WHERE id = ?3",
            params![latency_ms, tested_at, id],
        )?;
        Ok(())
    }

    // --- Subscriptions CRUD ---

    pub fn get_subscriptions(&self) -> Result<Vec<Subscription>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, name, url, format, auto_update, update_interval_hours,
                    last_updated_at, last_status, profile_count, created_at
             FROM subscriptions ORDER BY created_at DESC",
        )?;

        let iter = stmt.query_map([], |row| {
            Ok(Subscription {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                format: row.get(3)?,
                auto_update: row.get::<_, i32>(4)? != 0,
                update_interval_hours: row.get(5)?,
                last_updated_at: row.get(6)?,
                last_status: row.get(7)?,
                profile_count: row.get(8)?,
                created_at: row.get(9)?,
            })
        })?;

        let mut list = Vec::new();
        for s in iter {
            list.push(s?);
        }
        Ok(list)
    }

    pub fn save_subscription(&self, sub: &Subscription) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO subscriptions (
                id, name, url, format, auto_update, update_interval_hours,
                last_updated_at, last_status, profile_count, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                url = excluded.url,
                format = excluded.format,
                auto_update = excluded.auto_update,
                update_interval_hours = excluded.update_interval_hours,
                last_updated_at = excluded.last_updated_at,
                last_status = excluded.last_status,
                profile_count = excluded.profile_count",
            params![
                sub.id,
                sub.name,
                sub.url,
                sub.format,
                if sub.auto_update { 1 } else { 0 },
                sub.update_interval_hours,
                sub.last_updated_at,
                sub.last_status,
                sub.profile_count,
                sub.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_subscription(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM subscriptions WHERE id = ?1", params![id])?;
        conn.execute("DELETE FROM profiles WHERE subscription_id = ?1", params![id])?;
        Ok(())
    }

    // --- Routing Rules CRUD ---

    pub fn get_routing_rules(&self) -> Result<Vec<RoutingRule>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT id, name, rule_type, rule_value, action, priority, is_enabled, created_at
             FROM routing_rules ORDER BY priority ASC, name ASC",
        )?;

        let iter = stmt.query_map([], |row| {
            let type_str: String = row.get(2)?;
            let rule_type = match type_str.as_str() {
                "domain" => RoutingRuleType::Domain,
                "domain_suffix" => RoutingRuleType::DomainSuffix,
                "ip_cidr" => RoutingRuleType::IpCidr,
                "country" => RoutingRuleType::Country,
                "protocol" => RoutingRuleType::Protocol,
                "port" => RoutingRuleType::Port,
                _ => RoutingRuleType::DomainSuffix,
            };

            let action_str: String = row.get(4)?;
            let action = match action_str.as_str() {
                "direct" => RoutingAction::Direct,
                "proxy" => RoutingAction::Proxy,
                "block" => RoutingAction::Block,
                _ => RoutingAction::Proxy,
            };

            Ok(RoutingRule {
                id: row.get(0)?,
                name: row.get(1)?,
                rule_type,
                rule_value: row.get(3)?,
                action,
                priority: row.get(5)?,
                is_enabled: row.get::<_, i32>(6)? != 0,
                created_at: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in iter {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_routing_rule(&self, r: &RoutingRule) -> Result<()> {
        let conn = self.conn.lock();
        let type_str = match r.rule_type {
            RoutingRuleType::Domain => "domain",
            RoutingRuleType::DomainSuffix => "domain_suffix",
            RoutingRuleType::IpCidr => "ip_cidr",
            RoutingRuleType::Country => "country",
            RoutingRuleType::Protocol => "protocol",
            RoutingRuleType::Port => "port",
        };

        let action_str = match r.action {
            RoutingAction::Direct => "direct",
            RoutingAction::Proxy => "proxy",
            RoutingAction::Block => "block",
        };

        conn.execute(
            "INSERT INTO routing_rules (
                id, name, rule_type, rule_value, action, priority, is_enabled, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                rule_type = excluded.rule_type,
                rule_value = excluded.rule_value,
                action = excluded.action,
                priority = excluded.priority,
                is_enabled = excluded.is_enabled",
            params![
                r.id,
                r.name,
                type_str,
                r.rule_value,
                action_str,
                r.priority,
                if r.is_enabled { 1 } else { 0 },
                r.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn delete_routing_rule(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM routing_rules WHERE id = ?1", params![id])?;
        Ok(())
    }

    // --- Settings & DNS ---

    pub fn get_settings(&self) -> Result<AppSettings> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT theme, language, start_on_boot, minimize_to_tray, start_minimized,
                    default_mode, auto_reconnect, connection_timeout_secs, kill_switch_enabled,
                    dns_leak_protection, mtu, enable_ipv6, socks_port, http_port, clash_api_port
             FROM app_settings WHERE id = 1",
        )?;

        let settings = stmt.query_row([], |row| {
            let mode_str: String = row.get(5)?;
            let mode = if mode_str == "system_proxy" {
                OperatingMode::SystemProxy
            } else {
                OperatingMode::Tun
            };

            Ok(AppSettings {
                theme: row.get(0)?,
                language: row.get(1)?,
                start_on_boot: row.get::<_, i32>(2)? != 0,
                minimize_to_tray: row.get::<_, i32>(3)? != 0,
                start_minimized: row.get::<_, i32>(4)? != 0,
                default_mode: mode,
                auto_reconnect: row.get::<_, i32>(6)? != 0,
                connection_timeout_secs: row.get(7)?,
                kill_switch_enabled: row.get::<_, i32>(8)? != 0,
                dns_leak_protection: row.get::<_, i32>(9)? != 0,
                mtu: row.get(10)?,
                enable_ipv6: row.get::<_, i32>(11)? != 0,
                socks_port: row.get(12)?,
                http_port: row.get(13)?,
                clash_api_port: row.get(14)?,
            })
        })?;

        Ok(settings)
    }

    pub fn save_settings(&self, s: &AppSettings) -> Result<()> {
        let conn = self.conn.lock();
        let mode_str = match s.default_mode {
            OperatingMode::Tun => "tun",
            OperatingMode::SystemProxy => "system_proxy",
        };

        conn.execute(
            "UPDATE app_settings SET
                theme = ?1, language = ?2, start_on_boot = ?3, minimize_to_tray = ?4,
                start_minimized = ?5, default_mode = ?6, auto_reconnect = ?7,
                connection_timeout_secs = ?8, kill_switch_enabled = ?9,
                dns_leak_protection = ?10, mtu = ?11, enable_ipv6 = ?12,
                socks_port = ?13, http_port = ?14, clash_api_port = ?15
             WHERE id = 1",
            params![
                s.theme,
                s.language,
                if s.start_on_boot { 1 } else { 0 },
                if s.minimize_to_tray { 1 } else { 0 },
                if s.start_minimized { 1 } else { 0 },
                mode_str,
                if s.auto_reconnect { 1 } else { 0 },
                s.connection_timeout_secs,
                if s.kill_switch_enabled { 1 } else { 0 },
                if s.dns_leak_protection { 1 } else { 0 },
                s.mtu,
                if s.enable_ipv6 { 1 } else { 0 },
                s.socks_port,
                s.http_port,
                s.clash_api_port,
            ],
        )?;
        Ok(())
    }

    pub fn get_dns_config(&self) -> Result<DnsConfig> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT provider_type, primary_dns, fallback_dns, enable_dns_routing, prevent_leak
             FROM dns_settings WHERE id = 1",
        )?;

        let config = stmt.query_row([], |row| {
            Ok(DnsConfig {
                provider_type: row.get(0)?,
                primary_dns: row.get(1)?,
                fallback_dns: row.get(2)?,
                enable_dns_routing: row.get::<_, i32>(3)? != 0,
                prevent_leak: row.get::<_, i32>(4)? != 0,
            })
        })?;

        Ok(config)
    }

    pub fn save_dns_config(&self, c: &DnsConfig) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE dns_settings SET
                provider_type = ?1, primary_dns = ?2, fallback_dns = ?3,
                enable_dns_routing = ?4, prevent_leak = ?5
             WHERE id = 1",
            params![
                c.provider_type,
                c.primary_dns,
                c.fallback_dns,
                if c.enable_dns_routing { 1 } else { 0 },
                if c.prevent_leak { 1 } else { 0 },
            ],
        )?;
        Ok(())
    }
}
