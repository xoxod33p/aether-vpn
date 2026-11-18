use serde_json::{json, Value};
use crate::models::{Profile, VpnProtocol, AppSettings, DnsConfig, OperatingMode, RoutingRule, RoutingAction, RoutingRuleType};

pub struct SingboxConfigBuilder;

impl SingboxConfigBuilder {
    pub fn build(
        profile: &Profile,
        settings: &AppSettings,
        dns: &DnsConfig,
        rules: &[RoutingRule],
    ) -> Value {
        let outbound = Self::build_profile_outbound(profile);

        let mut inbounds = Vec::new();
        match settings.default_mode {
            OperatingMode::Tun => {
                let mut addresses = vec!["172.19.0.1/30"];
                if settings.enable_ipv6 {
                    addresses.push("fdfe:dcba:9876::1/126");
                }
                inbounds.push(json!({
                    "type": "tun",
                    "tag": "tun-in",
                    "interface_name": "AetherTun",
                    "address": addresses,
                    "auto_route": true,
                    "strict_route": false,
                    "route_exclude_address": [
                        "10.0.0.0/8",
                        "172.16.0.0/12",
                        "192.168.0.0/16",
                        "127.0.0.0/8",
                        "169.254.0.0/16",
                        "::1/128",
                        "fc00::/7",
                        "fe80::/10"
                    ],
                    "endpoint_independent_nat": true,
                    "stack": "system",
                    "sniff": true,
                    "mtu": settings.mtu
                }));
                inbounds.push(json!({
                    "type": "mixed",
                    "tag": "mixed-in",
                    "listen": "127.0.0.1",
                    "listen_port": settings.socks_port,
                    "sniff": true
                }));
            }
            OperatingMode::SystemProxy => {
                inbounds.push(json!({
                    "type": "mixed",
                    "tag": "mixed-in",
                    "listen": "127.0.0.1",
                    "listen_port": settings.socks_port,
                    "sniff": true
                }));
            }
        }

        let outbounds = vec![
            outbound,
            json!({
                "type": "direct",
                "tag": "direct"
            }),
        ];

        let mut direct_domains = Vec::new();
        if !profile.server.is_empty() {
            direct_domains.push(profile.server.clone());
        }
        if let Some(ref host) = profile.transport_host {
            if !host.is_empty() {
                direct_domains.push(host.clone());
            }
        }
        if let Some(ref sni) = profile.server_name {
            if !sni.is_empty() {
                direct_domains.push(sni.clone());
            }
        }
        direct_domains.sort();
        direct_domains.dedup();

        let mut route_rules = vec![
            json!({
                "protocol": "dns",
                "action": "hijack-dns"
            }),
            json!({
                "port": [53],
                "action": "hijack-dns"
            }),
            json!({
                "ip_is_private": true,
                "outbound": "direct"
            }),
            json!({
                "domain": ["localhost"],
                "domain_suffix": [".local", ".lan", ".localhost"],
                "outbound": "direct"
            }),
        ];

        if !direct_domains.is_empty() {
            route_rules.push(json!({
                "domain": direct_domains,
                "outbound": "direct"
            }));
        }

        for r in rules.iter().filter(|r| r.is_enabled) {
            let is_block = matches!(r.action, RoutingAction::Block);
            let target_outbound = match r.action {
                RoutingAction::Direct => "direct",
                RoutingAction::Proxy => "proxy",
                RoutingAction::Block => "direct",
            };

            let values: Vec<&str> = r.rule_value.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
            if values.is_empty() {
                continue;
            }

            let mut rule_obj = match r.rule_type {
                RoutingRuleType::Domain => json!({ "domain": values }),
                RoutingRuleType::DomainSuffix => json!({ "domain_suffix": values }),
                RoutingRuleType::IpCidr => json!({ "ip_cidr": values }),
                RoutingRuleType::Country => {
                    let geoips: Vec<&str> = values.iter().map(|v| v.strip_prefix("geoip:").unwrap_or(v)).collect();
                    json!({ "geoip": geoips })
                }
                RoutingRuleType::Port => {
                    let ports: Vec<u16> = values.iter().filter_map(|p| p.parse::<u16>().ok()).collect();
                    if ports.is_empty() {
                        continue;
                    }
                    json!({ "port": ports })
                }
                RoutingRuleType::Protocol => {
                    if values.contains(&"all") {
                        continue;
                    }
                    json!({ "network": values })
                }
            };

            if is_block {
                rule_obj["action"] = json!("reject");
            } else {
                rule_obj["outbound"] = json!(target_outbound);
            }

            route_rules.push(rule_obj);
        }

        let primary_addr = dns.primary_dns_or_fallback();
        let dns_servers = vec![
            json!({
                "tag": "remote-dns",
                "address": primary_addr,
                "address_resolver": "local-dns",
                "detour": "proxy"
            }),
            json!({
                "tag": "local-dns",
                "address": "local",
                "detour": "direct"
            }),
        ];

        let mut dns_rules = vec![
            json!({
                "outbound": "direct",
                "server": "local-dns"
            }),
            json!({
                "domain": ["localhost"],
                "domain_suffix": [".local", ".lan", ".localhost"],
                "server": "local-dns"
            }),
        ];

        if !direct_domains.is_empty() {
            dns_rules.push(json!({
                "domain": direct_domains,
                "server": "local-dns"
            }));
        }

        let dns_config = json!({
            "servers": dns_servers,
            "rules": dns_rules,
            "final": "remote-dns",
            "strategy": if settings.enable_ipv6 { "prefer_ipv4" } else { "ipv4_only" }
        });

        json!({
            "log": {
                "level": "info",
                "timestamp": true
            },
            "dns": dns_config,
            "inbounds": inbounds,
            "outbounds": outbounds,
            "route": {
                "rules": route_rules,
                "final": "proxy",
                "auto_detect_interface": true
            },
            "experimental": {
                "clash_api": {
                    "external_controller": format!("127.0.0.1:{}", settings.clash_api_port),
                    "secret": ""
                }
            }
        })
    }

    fn build_profile_outbound(p: &Profile) -> Value {
        match p.protocol {
            VpnProtocol::Vless => {
                let mut vless = json!({
                    "type": "vless",
                    "tag": "proxy",
                    "server": p.server,
                    "server_port": p.port,
                    "uuid": p.uuid.as_deref().unwrap_or("00000000-0000-0000-0000-000000000000"),
                });

                if let Some(ref flow) = p.flow {
                    if !flow.is_empty() {
                        vless["flow"] = json!(flow);
                    }
                }

                if let Some(ref packet_encoding) = p.packet_encoding {
                    if !packet_encoding.is_empty() {
                        vless["packet_encoding"] = json!(packet_encoding);
                    }
                } else {
                    vless["packet_encoding"] = json!("xudp");
                }

                if p.tls_enabled.unwrap_or(true) {
                    let mut tls = json!({
                        "enabled": true,
                        "server_name": p.server_name.as_deref().filter(|s| !s.is_empty()).unwrap_or(&p.server),
                        "insecure": p.allow_insecure.unwrap_or(false),
                    });

                    if let Some(ref alpn) = p.alpn {
                        if !alpn.is_empty() {
                            tls["alpn"] = json!(alpn);
                        }
                    }

                    if let Some(ref fp) = p.fingerprint {
                        if !fp.is_empty() {
                            tls["utls"] = json!({
                                "enabled": true,
                                "fingerprint": fp
                            });
                        }
                    }

                    if let Some(ref reality_pk) = p.reality_public_key {
                        if !reality_pk.is_empty() {
                            tls["reality"] = json!({
                                "enabled": true,
                                "public_key": reality_pk,
                                "short_id": p.reality_short_id.as_deref().unwrap_or("")
                            });
                            if tls.get("utls").is_none() {
                                tls["utls"] = json!({
                                    "enabled": true,
                                    "fingerprint": "chrome"
                                });
                            }
                        }
                    }

                    vless["tls"] = tls;
                }

                if let Some(ref transport) = p.transport_type {
                    match transport.as_str() {
                        "ws" => {
                            let mut ws = json!({
                                "type": "ws",
                                "path": p.transport_path.as_deref().filter(|s| !s.is_empty()).unwrap_or("/"),
                                "max_early_data": 2048,
                                "early_data_header_name": "Sec-WebSocket-Protocol"
                            });
                            let host = p.transport_host.as_deref().or(p.server_name.as_deref()).unwrap_or(&p.server);
                            if !host.is_empty() {
                                ws["headers"] = json!({ "Host": host });
                            }
                            vless["transport"] = ws;
                        }
                        "grpc" => {
                            vless["transport"] = json!({
                                "type": "grpc",
                                "service_name": p.transport_path.as_deref().filter(|s| !s.is_empty()).unwrap_or("grpc")
                            });
                        }
                        "http" => {
                            let mut http = json!({
                                "type": "http",
                                "path": p.transport_path.as_deref().filter(|s| !s.is_empty()).unwrap_or("/")
                            });
                            let host = p.transport_host.as_deref().or(p.server_name.as_deref()).unwrap_or(&p.server);
                            if !host.is_empty() {
                                http["host"] = json!([host]);
                            }
                            vless["transport"] = http;
                        }
                        _ => {}
                    }
                }

                vless
            }

            VpnProtocol::Shadowsocks => {
                json!({
                    "type": "shadowsocks",
                    "tag": "proxy",
                    "server": p.server,
                    "server_port": p.port,
                    "method": p.cipher.as_deref().unwrap_or("2022-blake3-aes-128-gcm"),
                    "password": p.password.as_deref().unwrap_or("")
                })
            }

            VpnProtocol::Trojan => {
                let mut trojan = json!({
                    "type": "trojan",
                    "tag": "proxy",
                    "server": p.server,
                    "server_port": p.port,
                    "password": p.password.as_deref().unwrap_or(""),
                });

                if p.tls_enabled.unwrap_or(true) {
                    let mut tls = json!({
                        "enabled": true,
                        "server_name": p.server_name.as_deref().filter(|s| !s.is_empty()).unwrap_or(&p.server),
                        "insecure": p.allow_insecure.unwrap_or(false)
                    });

                    if let Some(ref alpn) = p.alpn {
                        if !alpn.is_empty() {
                            tls["alpn"] = json!(alpn);
                        }
                    }

                    if let Some(ref fp) = p.fingerprint {
                        if !fp.is_empty() {
                            tls["utls"] = json!({
                                "enabled": true,
                                "fingerprint": fp
                            });
                        }
                    }

                    trojan["tls"] = tls;
                }

                if let Some(ref transport) = p.transport_type {
                    match transport.as_str() {
                        "ws" => {
                            let mut ws = json!({
                                "type": "ws",
                                "path": p.transport_path.as_deref().filter(|s| !s.is_empty()).unwrap_or("/"),
                                "max_early_data": 2048,
                                "early_data_header_name": "Sec-WebSocket-Protocol"
                            });
                            let host = p.transport_host.as_deref().or(p.server_name.as_deref()).unwrap_or(&p.server);
                            if !host.is_empty() {
                                ws["headers"] = json!({ "Host": host });
                            }
                            trojan["transport"] = ws;
                        }
                        "grpc" => {
                            trojan["transport"] = json!({
                                "type": "grpc",
                                "service_name": p.transport_path.as_deref().filter(|s| !s.is_empty()).unwrap_or("grpc")
                            });
                        }
                        _ => {}
                    }
                }

                trojan
            }

            VpnProtocol::Wireguard => {
                json!({
                    "type": "wireguard",
                    "tag": "proxy",
                    "server": p.server,
                    "server_port": p.port,
                    "private_key": p.wg_private_key.as_deref().unwrap_or(""),
                    "peer_public_key": p.wg_public_key.as_deref().unwrap_or(""),
                    "local_address": [p.wg_address.as_deref().unwrap_or("10.14.0.2/32")],
                    "mtu": p.wg_mtu.unwrap_or(1420)
                })
            }

            VpnProtocol::Hysteria2 => {
                json!({
                    "type": "hysteria2",
                    "tag": "proxy",
                    "server": p.server,
                    "server_port": p.port,
                    "password": p.password.as_deref().unwrap_or(""),
                    "tls": {
                        "enabled": true,
                        "server_name": p.server_name.as_deref().unwrap_or(&p.server),
                        "insecure": p.allow_insecure.unwrap_or(false)
                    }
                })
            }

            VpnProtocol::Vmess => {
                let mut vmess = json!({
                    "type": "vmess",
                    "tag": "proxy",
                    "server": p.server,
                    "server_port": p.port,
                    "uuid": p.uuid.as_deref().unwrap_or("00000000-0000-0000-0000-000000000000"),
                    "security": p.cipher.as_deref().unwrap_or("auto"),
                    "alter_id": p.alter_id.unwrap_or(0),
                });

                if let Some(ref packet_encoding) = p.packet_encoding {
                    if !packet_encoding.is_empty() {
                        vmess["packet_encoding"] = json!(packet_encoding);
                    }
                }

                if p.tls_enabled.unwrap_or(false) {
                    let mut tls = json!({
                        "enabled": true,
                        "server_name": p.server_name.as_deref().filter(|s| !s.is_empty()).unwrap_or(&p.server),
                        "insecure": p.allow_insecure.unwrap_or(false),
                    });

                    if let Some(ref alpn) = p.alpn {
                        if !alpn.is_empty() {
                            tls["alpn"] = json!(alpn);
                        }
                    }

                    if let Some(ref fp) = p.fingerprint {
                        if !fp.is_empty() {
                            tls["utls"] = json!({
                                "enabled": true,
                                "fingerprint": fp
                            });
                        }
                    }

                    vmess["tls"] = tls;
                }

                if let Some(ref transport) = p.transport_type {
                    match transport.as_str() {
                        "ws" => {
                            let mut ws = json!({
                                "type": "ws",
                                "path": p.transport_path.as_deref().filter(|s| !s.is_empty()).unwrap_or("/"),
                                "max_early_data": 2048,
                                "early_data_header_name": "Sec-WebSocket-Protocol"
                            });
                            let host = p.transport_host.as_deref().or(p.server_name.as_deref()).unwrap_or(&p.server);
                            if !host.is_empty() {
                                ws["headers"] = json!({ "Host": host });
                            }
                            vmess["transport"] = ws;
                        }
                        "grpc" => {
                            vmess["transport"] = json!({
                                "type": "grpc",
                                "service_name": p.transport_path.as_deref().filter(|s| !s.is_empty()).unwrap_or("grpc")
                            });
                        }
                        "http" => {
                            let mut http = json!({
                                "type": "http",
                                "path": p.transport_path.as_deref().filter(|s| !s.is_empty()).unwrap_or("/")
                            });
                            let host = p.transport_host.as_deref().or(p.server_name.as_deref()).unwrap_or(&p.server);
                            if !host.is_empty() {
                                http["host"] = json!([host]);
                            }
                            vmess["transport"] = http;
                        }
                        _ => {}
                    }
                }

                vmess
            }

            VpnProtocol::Socks5 => {
                let mut socks = json!({
                    "type": "socks",
                    "tag": "proxy",
                    "server": p.server,
                    "server_port": p.port
                });
                if let (Some(u), Some(pw)) = (&p.username, &p.password) {
                    socks["username"] = json!(u);
                    socks["password"] = json!(pw);
                }
                socks
            }
        }
    }
}

trait DnsHelper {
    fn primary_dns_or_fallback(&self) -> String;
}

impl DnsHelper for DnsConfig {
    fn primary_dns_or_fallback(&self) -> String {
        if self.primary_dns.is_empty() {
            "https://1.1.1.1/dns-query".to_string()
        } else {
            self.primary_dns.clone()
        }
    }
}
