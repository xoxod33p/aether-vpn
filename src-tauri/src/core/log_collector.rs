use std::collections::VecDeque;
use std::sync::{LazyLock, RwLock};
use crate::models::LogEntry;

pub static APP_LOG_BUFFER: LazyLock<RwLock<VecDeque<LogEntry>>> = LazyLock::new(|| {
    let mut deque = VecDeque::with_capacity(1000);
    deque.push_back(LogEntry {
        id: "init-0".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        level: "info".to_string(),
        message: "AetherVPN core subsystem initialized. Real-time telemetry and engine supervisor ready.".to_string(),
        target: Some("core::main".to_string()),
    });
    RwLock::new(deque)
});

pub fn append_log(level: &str, message: &str, target: Option<&str>) {
    if let Ok(mut buffer) = APP_LOG_BUFFER.write() {
        if buffer.len() >= 1000 {
            buffer.pop_front();
        }
        let now_nanos = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0);
        buffer.push_back(LogEntry {
            id: format!("log-{}", now_nanos),
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: level.to_string(),
            message: message.to_string(),
            target: target.map(String::from),
        });
    }
}

pub fn get_all_logs() -> Vec<LogEntry> {
    if let Ok(buffer) = APP_LOG_BUFFER.read() {
        buffer.iter().cloned().collect()
    } else {
        Vec::new()
    }
}

pub fn clear_all_logs() {
    if let Ok(mut buffer) = APP_LOG_BUFFER.write() {
        buffer.clear();
    }
}
