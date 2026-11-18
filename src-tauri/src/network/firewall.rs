#[allow(unused_imports)]
use tracing::{info, warn};

pub struct KillSwitchManager;

impl KillSwitchManager {
    /// Enable the firewall kill switch to prevent leaks outside the VPN tunnel
    pub fn enable(vpn_server_ip: &str, vpn_port: u16) -> Result<(), String> {
        info!("Enabling VPN kill switch for server {}:{}", vpn_server_ip, vpn_port);

        #[cfg(target_os = "windows")]
        {
            Self::enable_windows(vpn_server_ip, vpn_port)
        }

        #[cfg(target_os = "linux")]
        {
            Self::enable_linux(vpn_server_ip, vpn_port)
        }

        #[cfg(not(any(target_os = "windows", target_os = "linux")))]
        {
            warn!("Kill switch not yet supported on this platform");
            Ok(())
        }
    }

    /// Disable the firewall kill switch and restore normal connectivity
    pub fn disable() -> Result<(), String> {
        info!("Disabling VPN kill switch");

        #[cfg(target_os = "windows")]
        {
            Self::disable_windows()
        }

        #[cfg(target_os = "linux")]
        {
            Self::disable_linux()
        }

        #[cfg(not(any(target_os = "windows", target_os = "linux")))]
        {
            Ok(())
        }
    }

    #[cfg(target_os = "windows")]
    fn enable_windows(vpn_server_ip: &str, vpn_port: u16) -> Result<(), String> {
        // Clean any existing rules first for idempotency
        let _ = Self::disable_windows();

        // 1. Allow Loopback (127.0.0.1 and ::1)
        let _ = crate::core::silent_command("netsh")
            .args([
                "advfirewall", "firewall", "add", "rule",
                "name=AetherVPN_KS_AllowLoopback",
                "dir=out", "action=allow",
                "remoteip=127.0.0.1,::1",
                "enable=yes",
            ])
            .output();

        // 2. Allow Local LAN Subnets
        let _ = crate::core::silent_command("netsh")
            .args([
                "advfirewall", "firewall", "add", "rule",
                "name=AetherVPN_KS_AllowLAN",
                "dir=out", "action=allow",
                "remoteip=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16",
                "enable=yes",
            ])
            .output();

        // 3. Allow Traffic to the VPN Endpoint itself
        let remote_port_arg = format!("{}", vpn_port);
        let _ = crate::core::silent_command("netsh")
            .args([
                "advfirewall", "firewall", "add", "rule",
                "name=AetherVPN_KS_AllowVPN",
                "dir=out", "action=allow",
                &format!("remoteip={}", vpn_server_ip),
                &format!("remoteport={}", remote_port_arg),
                "protocol=any",
                "enable=yes",
            ])
            .output();

        // 4. Block All other Outbound traffic
        let output = crate::core::silent_command("netsh")
            .args([
                "advfirewall", "firewall", "add", "rule",
                "name=AetherVPN_KS_BlockAll",
                "dir=out", "action=block",
                "enable=yes",
            ])
            .output()
            .map_err(|e| format!("Failed to execute netsh: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            warn!("netsh add rule failed: {}", stderr);
            return Err(format!("Kill switch firewall activation requires administrative privileges: {}", stderr));
        }

        info!("Windows Firewall Kill Switch activated successfully");
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn disable_windows() -> Result<(), String> {
        // Delete ONLY our explicitly created rules silently
        let rules = [
            "AetherVPN_KS_BlockAll",
            "AetherVPN_KS_AllowVPN",
            "AetherVPN_KS_AllowLAN",
            "AetherVPN_KS_AllowLoopback",
        ];

        for rule in rules {
            let _ = crate::core::silent_command("netsh")
                .args(["advfirewall", "firewall", "delete", "rule", &format!("name={}", rule)])
                .output();
        }

        info!("Windows Firewall Kill Switch rules removed");
        Ok(())
    }

    #[cfg(target_os = "linux")]
    fn enable_linux(vpn_server_ip: &str, vpn_port: u16) -> Result<(), String> {
        use std::process::Command;

        let _ = Self::disable_linux();

        // Allow loopback
        let _ = Command::new("iptables")
            .args(["-A", "OUTPUT", "-o", "lo", "-m", "comment", "--comment", "AetherVPN_KS_Loopback", "-j", "ACCEPT"])
            .output();

        // Allow VPN server traffic
        let _ = Command::new("iptables")
            .args([
                "-A", "OUTPUT", "-d", vpn_server_ip, "-p", "tcp", "--dport", &vpn_port.to_string(),
                "-m", "comment", "--comment", "AetherVPN_KS_VPN", "-j", "ACCEPT",
            ])
            .output();
        let _ = Command::new("iptables")
            .args([
                "-A", "OUTPUT", "-d", vpn_server_ip, "-p", "udp", "--dport", &vpn_port.to_string(),
                "-m", "comment", "--comment", "AetherVPN_KS_VPN", "-j", "ACCEPT",
            ])
            .output();

        // Allow tun interface traffic
        let _ = Command::new("iptables")
            .args(["-A", "OUTPUT", "-o", "tun+", "-m", "comment", "--comment", "AetherVPN_KS_TUN", "-j", "ACCEPT"])
            .output();

        // Drop rest of output traffic
        let _ = Command::new("iptables")
            .args(["-A", "OUTPUT", "-m", "comment", "--comment", "AetherVPN_KS_Block", "-j", "DROP"])
            .output();

        info!("Linux iptables Kill Switch activated");
        Ok(())
    }

    #[cfg(target_os = "linux")]
    fn disable_linux() -> Result<(), String> {
        use std::process::Command;

        // Delete rules with comments
        let _ = Command::new("iptables")
            .args(["-D", "OUTPUT", "-m", "comment", "--comment", "AetherVPN_KS_Block", "-j", "DROP"])
            .output();
        let _ = Command::new("iptables")
            .args(["-D", "OUTPUT", "-o", "tun+", "-m", "comment", "--comment", "AetherVPN_KS_TUN", "-j", "ACCEPT"])
            .output();
        let _ = Command::new("iptables")
            .args(["-D", "OUTPUT", "-o", "lo", "-m", "comment", "--comment", "AetherVPN_KS_Loopback", "-j", "ACCEPT"])
            .output();

        info!("Linux iptables Kill Switch rules cleared");
        Ok(())
    }
}
