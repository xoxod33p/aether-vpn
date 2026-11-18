use aether_vpn_lib::models::{
    Profile, VpnProtocol, AppSettings, DnsConfig, OperatingMode, RoutingRule,
    RoutingAction, RoutingRuleType,
};
use aether_vpn_lib::protocols::SingboxConfigBuilder;
use aether_vpn_lib::core::ProcessManager;

#[test]
fn test_singbox_vless_config_generation() {
    let profile = Profile {
        id: "prof-vless-test".to_string(),
        name: "Test VLESS Reality".to_string(),
        protocol: VpnProtocol::Vless,
        server: "de.vpn.test".to_string(),
        port: 443,
        username: None,
        password: None,
        uuid: Some("7c40d70b-520e-4ea7-9a91-4cf1e27e8d24".to_string()),
        cipher: None,
        tls_enabled: Some(true),
        server_name: Some("de.vpn.test".to_string()),
        allow_insecure: Some(false),
        alpn: None,
        reality_public_key: Some("test_public_key".to_string()),
        reality_short_id: Some("12345678".to_string()),
        transport_type: Some("ws".to_string()),
        transport_path: Some("/vless-ws".to_string()),
        wg_private_key: None,
        wg_public_key: None,
        wg_address: None,
        wg_dns: None,
        wg_mtu: None,
        country_code: Some("DE".to_string()),
        group_name: None,
        is_favorite: false,
        latency_ms: None,
        last_tested_at: None,
        subscription_id: None,
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
        ..Default::default()
    };

    let settings = AppSettings::default();
    let dns = DnsConfig::default();
    let rules = vec![
        RoutingRule {
            id: "rule-1".to_string(),
            name: "Adblock".to_string(),
            rule_type: RoutingRuleType::DomainSuffix,
            rule_value: "doubleclick.net".to_string(),
            action: RoutingAction::Block,
            priority: 1,
            is_enabled: true,
            created_at: "2026-01-01T00:00:00Z".to_string(),
        }
    ];

    let config = SingboxConfigBuilder::build(&profile, &settings, &dns, &rules);

    assert!(config.get("log").is_some());
    assert!(config.get("dns").is_some());
    assert!(config.get("inbounds").is_some());
    assert!(config.get("outbounds").is_some());
    assert!(config.get("route").is_some());
    assert!(config.get("experimental").is_some());

    let outbounds = config["outbounds"].as_array().expect("Outbounds must be an array");
    let proxy_out = outbounds.iter().find(|o| o["tag"] == "proxy").expect("Proxy outbound missing");
    assert_eq!(proxy_out["type"], "vless");
    assert_eq!(proxy_out["server"], "de.vpn.test");
    assert_eq!(proxy_out["server_port"], 443);
    assert_eq!(proxy_out["uuid"], "7c40d70b-520e-4ea7-9a91-4cf1e27e8d24");
    assert_eq!(proxy_out["tls"]["enabled"], true);
    assert_eq!(proxy_out["transport"]["type"], "ws");
    assert_eq!(proxy_out["transport"]["path"], "/vless-ws");

    assert_eq!(config["experimental"]["clash_api"]["external_controller"], "127.0.0.1:9090");
}

#[test]
fn test_singbox_wireguard_config_generation() {
    let profile = Profile {
        id: "prof-wg-test".to_string(),
        name: "Test WireGuard".to_string(),
        protocol: VpnProtocol::Wireguard,
        server: "wg.vpn.test".to_string(),
        port: 51820,
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
        wg_private_key: Some("cGFzc3dvcmQxMjM0NTY3ODkwMTI=".to_string()),
        wg_public_key: Some("bm9yZXBseUBhZXRoZXJ2cG4ubmV0d29yawo=".to_string()),
        wg_address: Some("10.14.0.2/32".to_string()),
        wg_dns: Some("1.1.1.1".to_string()),
        wg_mtu: Some(1380),
        country_code: Some("US".to_string()),
        group_name: None,
        is_favorite: false,
        latency_ms: None,
        last_tested_at: None,
        subscription_id: None,
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
        ..Default::default()
    };

    let settings = AppSettings::default();
    let dns = DnsConfig::default();
    let config = SingboxConfigBuilder::build(&profile, &settings, &dns, &[]);

    let outbounds = config["outbounds"].as_array().expect("Outbounds must be an array");
    let proxy_out = outbounds.iter().find(|o| o["tag"] == "proxy").expect("Proxy outbound missing");
    assert_eq!(proxy_out["type"], "wireguard");
    assert_eq!(proxy_out["server"], "wg.vpn.test");
    assert_eq!(proxy_out["server_port"], 51820);
    assert_eq!(proxy_out["mtu"], 1380);
}

#[test]
fn test_singbox_schema_validation_against_real_binary() {
    if let Ok(bin_path) = ProcessManager::find_singbox_binary() {
        println!("Found sing-box binary at: {:?}", bin_path);

        let profile = Profile {
            id: "prof-ss-test".to_string(),
            name: "Test Shadowsocks".to_string(),
            protocol: VpnProtocol::Shadowsocks,
            server: "127.0.0.1".to_string(),
            port: 8388,
            username: None,
            password: Some("password123".to_string()),
            uuid: None,
            cipher: Some("aes-256-gcm".to_string()),
            tls_enabled: None,
            server_name: None,
            allow_insecure: None,
            alpn: None,
            reality_public_key: None,
            reality_short_id: None,
            transport_type: None,
            transport_path: None,
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
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            ..Default::default()
        };

        let mut settings = AppSettings::default();
        settings.default_mode = OperatingMode::SystemProxy;
        let dns = DnsConfig::default();

        let config = SingboxConfigBuilder::build(&profile, &settings, &dns, &[]);
        let temp_file = std::env::temp_dir().join("singbox_test_check.json");
        std::fs::write(&temp_file, serde_json::to_string_pretty(&config).unwrap()).unwrap();

        let output = std::process::Command::new(&bin_path)
            .args(["check", "-c"])
            .arg(&temp_file)
            .output()
            .expect("Failed to execute sing-box check");

        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        println!("sing-box check stdout: {}", stdout);
        println!("sing-box check stderr: {}", stderr);

        let _ = std::fs::remove_file(temp_file);
        assert!(output.status.success(), "sing-box check validation failed: {}{}", stdout, stderr);
    }
}
