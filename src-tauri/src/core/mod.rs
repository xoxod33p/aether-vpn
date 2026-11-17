pub mod connection_manager;
pub mod process_manager;
pub mod traffic_monitor;
pub mod log_collector;

pub use connection_manager::ConnectionManager;
pub use process_manager::ProcessManager;
pub use traffic_monitor::TrafficMonitor;
pub use log_collector::{append_log, get_all_logs, clear_all_logs};

/// Creates a process Command that is guaranteed to run silently with NO visible console or PowerShell window on Windows
#[cfg(windows)]
pub fn silent_command(program: &str) -> std::process::Command {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let mut cmd = std::process::Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

/// Creates a process Command for non-Windows platforms
#[cfg(not(windows))]
pub fn silent_command(program: &str) -> std::process::Command {
    std::process::Command::new(program)
}
