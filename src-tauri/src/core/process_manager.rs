use std::path::PathBuf;
use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::Mutex;
use tracing::{info, warn};

pub struct ProcessManager {
    child: Arc<Mutex<Option<Child>>>,
    config_path: Arc<parking_lot::Mutex<Option<PathBuf>>>,
    last_error: Arc<parking_lot::Mutex<Option<String>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            config_path: Arc::new(parking_lot::Mutex::new(None)),
            last_error: Arc::new(parking_lot::Mutex::new(None)),
        }
    }

    pub fn get_last_error(&self) -> Option<String> {
        self.last_error.lock().clone()
    }

    /// Kills any lingering sing-box processes on the system with zero console window popup
    pub fn kill_orphans() {
        #[cfg(windows)]
        {
            let _ = crate::core::silent_command("taskkill")
                .args(["/F", "/IM", "sing-box.exe"])
                .output();
        }
        #[cfg(not(windows))]
        {
            let _ = std::process::Command::new("pkill")
                .arg("-9")
                .arg("sing-box")
                .output();
        }
    }

    pub fn find_singbox_binary() -> Result<PathBuf, String> {
        // 1. Check relative to current executable directory (production/installed mode)
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let exe_candidates = [
                    parent.join("bin").join("sing-box.exe"),
                    parent.join("bin").join("sing-box"),
                    parent.join("sing-box.exe"),
                    parent.join("sing-box"),
                    parent.join("resources").join("bin").join("sing-box.exe"),
                    parent.join("resources").join("bin").join("sing-box"),
                    parent.join("resources").join("sing-box.exe"),
                    parent.join("resources").join("sing-box"),
                    parent.join("_up_").join("bin").join("sing-box.exe"),
                ];
                for c in &exe_candidates {
                    if c.exists() {
                        return Ok(c.canonicalize().unwrap_or_else(|_| c.clone()));
                    }
                }
            }
        }

        // 2. Check local workspace and system directories
        let candidates = [
            PathBuf::from("src-tauri/bin/sing-box.exe"),
            PathBuf::from("src-tauri/bin/sing-box"),
            PathBuf::from("bin/sing-box.exe"),
            PathBuf::from("bin/sing-box"),
            PathBuf::from("sing-box.exe"),
            PathBuf::from("sing-box"),
            dirs::data_local_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("AetherVPN")
                .join("bin")
                .join("sing-box.exe"),
            dirs::data_local_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("AetherVPN")
                .join("bin")
                .join("sing-box"),
            PathBuf::from(r"C:\Users\xoxod33p\.deeptunnel\bin\sing-box.exe"),
        ];

        for c in &candidates {
            if c.exists() {
                return Ok(c.canonicalize().unwrap_or_else(|_| c.clone()));
            }
        }

        // Search PATH
        if let Some(path_var) = std::env::var_os("PATH") {
            for p in std::env::split_paths(&path_var) {
                let candidate = p.join("sing-box.exe");
                if candidate.exists() {
                    return Ok(candidate);
                }
                let candidate_nix = p.join("sing-box");
                if candidate_nix.exists() {
                    return Ok(candidate_nix);
                }
            }
        }

        Err("sing-box networking engine binary not found. Please install sing-box.".to_string())
    }

    pub async fn start(&self, config_json: serde_json::Value) -> Result<(), String> {
        self.stop().await?;

        // Ensure any lingering orphan process from a previous crash/session is terminated
        Self::kill_orphans();
        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

        *self.last_error.lock() = None;

        let bin_path = Self::find_singbox_binary()?;
        info!("Using sing-box engine binary at: {:?}", bin_path);

        let temp_dir = std::env::temp_dir().join("AetherVPN");
        let _ = std::fs::create_dir_all(&temp_dir);
        let cfg_file = temp_dir.join("active_config.json");

        let config_str = serde_json::to_string_pretty(&config_json)
            .map_err(|e| format!("Failed to serialize sing-box configuration: {}", e))?;

        std::fs::write(&cfg_file, &config_str)
            .map_err(|e| format!("Failed to write configuration file: {}", e))?;

        info!("Wrote sing-box active configuration to: {:?}", cfg_file);

        let mut cmd = Command::new(&bin_path);
        if let Some(parent) = bin_path.parent() {
            cmd.current_dir(parent);
        }

        cmd.arg("run")
            .arg("-c")
            .arg(&cfg_file)
            .env("ENABLE_DEPRECATED_TUN_ADDRESS_X", "true")
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        #[cfg(windows)]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd.spawn()
            .map_err(|e| format!("Failed to spawn sing-box engine: {}", e))?;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        if let Some(stdout) = stdout {
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let sanitized = sanitize_log_line(&line);
                    info!(target: "vpn", "{}", sanitized);
                    crate::core::append_log("engine", &sanitized, Some("vpn"));
                }
            });
        }

        let last_err_sink = self.last_error.clone();
        if let Some(stderr) = stderr {
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let sanitized = sanitize_log_line(&line);
                    let level = if sanitized.contains("FATAL") || sanitized.contains("ERROR") || sanitized.contains("Access is denied") {
                        *last_err_sink.lock() = Some(sanitized.clone());
                        "error"
                    } else if sanitized.contains("WARN") {
                        "warn"
                    } else if sanitized.contains("INFO") {
                        "info"
                    } else {
                        "engine"
                    };
                    if level == "error" || level == "warn" {
                        warn!(target: "vpn", "{}", sanitized);
                    } else {
                        info!(target: "vpn", "{}", sanitized);
                    }
                    crate::core::append_log(level, &sanitized, Some("vpn"));
                }
            });
        }

        // Validate that core didn't exit immediately on startup
        tokio::time::sleep(tokio::time::Duration::from_millis(350)).await;
        if let Ok(Some(exit_status)) = child.try_wait() {
            let detail = self.last_error.lock().clone()
                .unwrap_or_else(|| format!("VPN process exited immediately with status {}", exit_status));
            return Err(format!("VPN engine failed to start: {}", detail));
        }

        {
            let mut guard = self.child.lock().await;
            *guard = Some(child);
        }
        *self.config_path.lock() = Some(cfg_file);

        info!("VPN core started successfully.");
        Ok(())
    }

    pub async fn stop(&self) -> Result<(), String> {
        let child_opt = {
            let mut child_guard = self.child.lock().await;
            child_guard.take()
        };

        if let Some(mut child) = child_opt {
            info!("Stopping VPN core process...");
            let _ = child.kill().await;
            let _ = child.wait().await;
            info!("VPN core process terminated.");
        }

        // Clean any lingering orphans silently
        Self::kill_orphans();

        let mut cfg_guard = self.config_path.lock();
        if let Some(path) = cfg_guard.take() {
            let _ = std::fs::remove_file(path);
        }

        Ok(())
    }

    pub async fn is_running(&self) -> bool {
        let mut guard = self.child.lock().await;
        if let Some(ref mut child) = *guard {
            match child.try_wait() {
                Ok(None) => true,
                _ => {
                    *guard = None;
                    false
                }
            }
        } else {
            false
        }
    }
}

fn sanitize_log_line(line: &str) -> String {
    // Strip ANSI escape sequences (e.g. \x1b[33mWARN\x1b[0m)
    let ansi_regex = regex::Regex::new(r"\x1B\[[0-9;]*[a-zA-Z]").unwrap();
    let cleaned = ansi_regex.replace_all(line, "");

    let mut out = cleaned.to_string();
    let uuid_regex = regex::Regex::new(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}").unwrap();
    out = uuid_regex.replace_all(&out, "[REDACTED-UUID]").to_string();

    let pass_regex = regex::Regex::new(r#"(?i)(password|secret|key)["']?\s*[:=]\s*["']?([^"',\s]+)"#).unwrap();
    out = pass_regex.replace_all(&out, "$1=[REDACTED]").to_string();

    out
}
