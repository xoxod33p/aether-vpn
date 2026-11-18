use aether_vpn_lib::network::SubscriptionParser;
use aether_vpn_lib::models::VpnProtocol;

#[test]
fn test_parse_vless_share_link() {
    let link = "vless://7c40d70b-520e-4ea7-9a91-4cf1e27e8d24@frankfurt.node.vpn:443?security=reality&sni=de.vpn.com&pbk=pubkey123&sid=1234&type=ws&path=%2Fvless-ws#%5BDE%5D%20Frankfurt%20Ultra";
    let profile = SubscriptionParser::parse_vless_link(link, "test-sub")
        .expect("Failed to parse VLESS share link");

    assert_eq!(profile.name, "[DE] Frankfurt Ultra");
    assert_eq!(profile.protocol, VpnProtocol::Vless);
    assert_eq!(profile.server, "frankfurt.node.vpn");
    assert_eq!(profile.port, 443);
    assert_eq!(profile.uuid.as_deref(), Some("7c40d70b-520e-4ea7-9a91-4cf1e27e8d24"));
    assert_eq!(profile.tls_enabled, Some(true));
    assert_eq!(profile.server_name.as_deref(), Some("de.vpn.com"));
    assert_eq!(profile.reality_public_key.as_deref(), Some("pubkey123"));
    assert_eq!(profile.reality_short_id.as_deref(), Some("1234"));
    assert_eq!(profile.transport_type.as_deref(), Some("ws"));
    assert_eq!(profile.transport_path.as_deref(), Some("/vless-ws"));
    assert_eq!(profile.country_code.as_deref(), Some("DE"));
    assert_eq!(profile.subscription_id.as_deref(), Some("test-sub"));
}

#[test]
fn test_parse_trojan_share_link() {
    let link = "trojan://secretpassword123@tokyo.trojan.net:443?sni=jp.trojan.net#Tokyo%20Express";
    let profile = SubscriptionParser::parse_trojan_link(link, "test-sub")
        .expect("Failed to parse Trojan link");

    assert_eq!(profile.name, "Tokyo Express");
    assert_eq!(profile.protocol, VpnProtocol::Trojan);
    assert_eq!(profile.server, "tokyo.trojan.net");
    assert_eq!(profile.port, 443);
    assert_eq!(profile.password.as_deref(), Some("secretpassword123"));
    assert_eq!(profile.server_name.as_deref(), Some("jp.trojan.net"));
    assert_eq!(profile.country_code.as_deref(), Some("JP"));
}

#[test]
fn test_parse_shadowsocks_share_link() {
    let link = "ss://YWVzLTI1Ni1nY206cGFzczEyMw==@london.ss.org:8388#London%20Fast";
    let profile = SubscriptionParser::parse_shadowsocks_link(link, "test-sub")
        .expect("Failed to parse Shadowsocks link");

    assert_eq!(profile.name, "London Fast");
    assert_eq!(profile.protocol, VpnProtocol::Shadowsocks);
    assert_eq!(profile.server, "london.ss.org");
    assert_eq!(profile.port, 8388);
    assert_eq!(profile.cipher.as_deref(), Some("aes-256-gcm"));
    assert_eq!(profile.password.as_deref(), Some("pass123"));
    assert_eq!(profile.country_code.as_deref(), Some("GB"));
}

#[test]
fn test_parse_clash_yaml_subscription() {
    let clash_yaml = r#"
proxies:
  - name: "[US] New York 01"
    type: ss
    server: us-nyc.clash.net
    port: 8388
    cipher: aes-256-gcm
    password: clashpassword123
  - name: "[DE] Frankfurt 02"
    type: vless
    server: de-fra.clash.net
    port: 443
    uuid: 11111111-2222-3333-4444-555555555555
    tls: true
    servername: de-fra.clash.net
"#;

    let profiles = SubscriptionParser::parse_clash_yaml(clash_yaml, "clash-sub")
        .expect("Failed to parse Clash YAML");

    assert_eq!(profiles.len(), 2);
    assert_eq!(profiles[0].name, "[US] New York 01");
    assert_eq!(profiles[0].protocol, VpnProtocol::Shadowsocks);
    assert_eq!(profiles[0].server, "us-nyc.clash.net");
    assert_eq!(profiles[0].country_code.as_deref(), Some("US"));

    assert_eq!(profiles[1].name, "[DE] Frankfurt 02");
    assert_eq!(profiles[1].protocol, VpnProtocol::Vless);
    assert_eq!(profiles[1].server, "de-fra.clash.net");
    assert_eq!(profiles[1].country_code.as_deref(), Some("DE"));
}

#[test]
fn test_parse_singbox_json_subscription() {
    let singbox_json = r#"{
  "outbounds": [
    {
      "type": "vless",
      "tag": "SG - Singapore High Speed",
      "server": "sg.singbox.net",
      "server_port": 443,
      "uuid": "abcdef12-3456-7890-abcd-ef1234567890",
      "tls": {
        "enabled": true,
        "server_name": "sg.singbox.net"
      }
    },
    {
      "type": "direct",
      "tag": "direct"
    }
  ]
}"#;

    let profiles = SubscriptionParser::parse_singbox_json(singbox_json, "singbox-sub")
        .expect("Failed to parse sing-box JSON");

    assert_eq!(profiles.len(), 1);
    assert_eq!(profiles[0].name, "SG - Singapore High Speed");
    assert_eq!(profiles[0].protocol, VpnProtocol::Vless);
    assert_eq!(profiles[0].server, "sg.singbox.net");
    assert_eq!(profiles[0].port, 443);
    assert_eq!(profiles[0].country_code.as_deref(), Some("SG"));
}
