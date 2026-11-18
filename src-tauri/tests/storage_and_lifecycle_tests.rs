use aether_vpn_lib::models::{
    Profile, VpnProtocol, OperatingMode, ConnectionStatus,
};
use aether_vpn_lib::storage::Database;
use aether_vpn_lib::core::ConnectionManager;

#[tokio::test]
async fn test_in_memory_database_migration_and_defaults() {
    let db = Database::in_memory().expect("Failed to initialize in-memory SQLite database");

    let profiles = db.get_profiles().expect("Failed to fetch profiles");
    assert!(profiles.is_empty(), "Database should start with zero mock profiles");

    let settings = db.get_settings().expect("Failed to fetch settings");
    assert_eq!(settings.theme, "dark");
    assert_eq!(settings.default_mode, OperatingMode::Tun);
    assert_eq!(settings.mtu, 9000);

    let dns = db.get_dns_config().expect("Failed to fetch DNS config");
    assert_eq!(dns.provider_type, "doh");
    assert_eq!(dns.primary_dns, "https://1.1.1.1/dns-query");

    let rules = db.get_routing_rules().expect("Failed to fetch routing rules");
    assert!(rules.len() >= 3, "Expected default LAN bypass routing rules");
}

#[tokio::test]
async fn test_profile_crud_lifecycle() {
    let db = Database::in_memory().expect("Failed to create in-memory database");

    let now = chrono::Utc::now().to_rfc3339();
    let new_profile = Profile {
        id: "test-wireguard-1".to_string(),
        name: "Zurich Secure Core WG".to_string(),
        protocol: VpnProtocol::Wireguard,
        server: "ch-zrh.vpn.local".to_string(),
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
        wg_private_key: Some("private_key_redacted".to_string()),
        wg_public_key: Some("public_key_abc123".to_string()),
        wg_address: Some("10.8.0.2/32".to_string()),
        wg_dns: Some("1.1.1.1".to_string()),
        wg_mtu: Some(1420),
        country_code: Some("CH".to_string()),
        group_name: Some("Europe".to_string()),
        is_favorite: true,
        latency_ms: Some(28),
        last_tested_at: Some(now.clone()),
        subscription_id: None,
        created_at: now.clone(),
        updated_at: now.clone(),
        ..Default::default()
    };

    db.save_profile(&new_profile).expect("Failed to save profile");

    let profiles = db.get_profiles().expect("Failed to retrieve profiles");
    let found = profiles.iter().find(|p| p.id == "test-wireguard-1");
    assert!(found.is_some(), "Profile was not saved in database");
    let found_prof = found.unwrap();
    assert_eq!(found_prof.name, "Zurich Secure Core WG");
    assert_eq!(found_prof.protocol, VpnProtocol::Wireguard);
    assert_eq!(found_prof.wg_mtu, Some(1420));

    db.delete_profile("test-wireguard-1").expect("Failed to delete profile");
    let profiles_after = db.get_profiles().expect("Failed to retrieve profiles after deletion");
    assert!(profiles_after.iter().find(|p| p.id == "test-wireguard-1").is_none());
}

#[tokio::test]
async fn test_connection_manager_state_machine() {
    let db = Database::in_memory().expect("Failed to create in-memory database");

    let now = chrono::Utc::now().to_rfc3339();
    let test_profile = Profile {
        id: "test-prof-1".to_string(),
        name: "Test Node".to_string(),
        protocol: VpnProtocol::Socks5,
        server: "127.0.0.1".to_string(),
        port: 1080,
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
        wg_private_key: None,
        wg_public_key: None,
        wg_address: None,
        wg_dns: None,
        wg_mtu: None,
        country_code: Some("US".to_string()),
        group_name: Some("Test".to_string()),
        is_favorite: false,
        latency_ms: None,
        last_tested_at: None,
        subscription_id: None,
        created_at: now.clone(),
        updated_at: now,
        ..Default::default()
    };
    db.save_profile(&test_profile).expect("Failed to save test profile");

    let mgr = ConnectionManager::new(db);

    let initial_status = mgr.get_status();
    assert_eq!(initial_status.status, ConnectionStatus::Disconnected);
    assert_eq!(initial_status.active_profile_id, None);

    let initial_stats = mgr.get_traffic_stats();
    assert_eq!(initial_stats.download_speed_bps, 0);
    assert_eq!(initial_stats.upload_speed_bps, 0);

    let connected_info = mgr.connect("test-prof-1").await.expect("Failed to connect");
    assert_eq!(connected_info.status, ConnectionStatus::Connected);
    assert_eq!(connected_info.active_profile_id, Some("test-prof-1".to_string()));
    assert!(connected_info.connected_at.is_some());

    let active_stats = mgr.get_traffic_stats();
    assert_eq!(active_stats.active_connections, 0);

    let disconnected_info = mgr.disconnect().await.expect("Failed to disconnect");
    assert_eq!(disconnected_info.status, ConnectionStatus::Disconnected);
    assert_eq!(disconnected_info.active_profile_id, None);

    let stats_after = mgr.get_traffic_stats();
    assert_eq!(stats_after.download_speed_bps, 0);
    assert_eq!(stats_after.active_connections, 0);
}
