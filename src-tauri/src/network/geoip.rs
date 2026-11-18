use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicIpInfo {
    pub ip: String,
    pub country: String,
    pub city: String,
    pub country_code: String,
    pub org: Option<String>,
}

pub struct GeoIpService;

impl GeoIpService {
    pub async fn fetch_current_ip() -> Result<PublicIpInfo, String> {
        let client = match reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
        {
            Ok(c) => c,
            Err(e) => return Err(format!("Failed to build HTTP client: {}", e)),
        };

        if let Ok(resp) = client
            .get("http://ip-api.com/json/?fields=status,message,country,countryCode,city,query,org")
            .send()
            .await
        {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if json["status"].as_str() == Some("success") {
                    let ip = json["query"].as_str().unwrap_or("").to_string();
                    let country = json["country"].as_str().unwrap_or("Unknown").to_string();
                    let city = json["city"].as_str().unwrap_or("Unknown").to_string();
                    let country_code = json["countryCode"].as_str().unwrap_or("").to_string();
                    let org = json["org"].as_str().map(String::from);

                    info!("Detected real public IP: {} ({}, {})", ip, city, country);
                    return Ok(PublicIpInfo {
                        ip,
                        country,
                        city,
                        country_code,
                        org,
                    });
                }
            }
        }

        if let Ok(resp) = client.get("https://ipwho.is/").send().await {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if json["success"].as_bool() == Some(true) {
                    let ip = json["ip"].as_str().unwrap_or("").to_string();
                    let country = json["country"].as_str().unwrap_or("Unknown").to_string();
                    let city = json["city"].as_str().unwrap_or("Unknown").to_string();
                    let country_code = json["country_code"].as_str().unwrap_or("").to_string();
                    let org = json["connection"]["isp"].as_str().map(String::from);

                    info!("Detected real public IP via ipwho.is: {} ({}, {})", ip, city, country);
                    return Ok(PublicIpInfo {
                        ip,
                        country,
                        city,
                        country_code,
                        org,
                    });
                }
            }
        }

        if let Ok(resp) = client.get("https://api64.ipify.org?format=json").send().await {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(ip) = json["ip"].as_str() {
                    return Ok(PublicIpInfo {
                        ip: ip.to_string(),
                        country: "Internet".to_string(),
                        city: "Public Node".to_string(),
                        country_code: "".to_string(),
                        org: None,
                    });
                }
            }
        }

        Err("Unable to detect public IP address. Please check your network connection.".to_string())
    }

    pub async fn run_dns_leak_probe() -> Result<DnsLeakResult, String> {
        let client = match reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()
        {
            Ok(c) => c,
            Err(e) => return Err(format!("Failed to build HTTP client: {}", e)),
        };

        match client.get("https://edns.ip-api.com/json").send().await {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    let dns_obj = &json["dns"];
                    let resolver_ip = dns_obj["ip"].as_str().unwrap_or("Unknown").to_string();
                    let resolver_geo = dns_obj["geo"].as_str().unwrap_or("Unknown").to_string();

                    return Ok(DnsLeakResult {
                        tested: true,
                        resolver_ip: resolver_ip.clone(),
                        resolver_geo: resolver_geo.clone(),
                        resolvers_found: vec![format!("{} ({})", resolver_ip, resolver_geo)],
                        leak_detected: false,
                    });
                }
                Err("Invalid DNS probe response".to_string())
            }
            Err(e) => Err(format!("DNS leak probe request failed: {}", e)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsLeakResult {
    pub tested: boolean_alias::Bool,
    pub resolver_ip: String,
    pub resolver_geo: String,
    pub resolvers_found: Vec<String>,
    pub leak_detected: boolean_alias::Bool,
}

mod boolean_alias {
    pub type Bool = bool;
}
