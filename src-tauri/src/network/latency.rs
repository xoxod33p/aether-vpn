use std::time::{Duration, Instant};
use tokio::net::TcpStream;
use tokio::time::timeout;
use tracing::info;

pub struct LatencyTester;

impl LatencyTester {
    /// Measure round-trip TCP connection time in milliseconds
    pub async fn measure_tcp_latency(host: &str, port: u16, timeout_duration: Duration) -> Result<u32, String> {
        let target = format!("{}:{}", host, port);
        let start = Instant::now();

        // Perform DNS resolution and TCP 3-way handshake with timeout
        let result = timeout(timeout_duration, TcpStream::connect(&target)).await;

        match result {
            Ok(Ok(_stream)) => {
                let ms = start.elapsed().as_millis() as u32;
                info!("Latency test to {} succeeded: {}ms", target, ms);
                Ok(ms)
            }
            Ok(Err(e)) => Err(format!("Connection to {}:{} refused or failed: {}", host, port, e)),
            Err(_) => Err(format!("Latency test to {}:{} timed out after {}ms", host, port, timeout_duration.as_millis())),
        }
    }
}
