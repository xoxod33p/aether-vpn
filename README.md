# AetherVPN

A fast, lightweight, and modern desktop VPN and proxy client designed for maximum privacy, speed, and simplicity.

---

## ✨ Features

- **One-Click Connect**: Instant secure connection with real-time speed and ping telemetry.
- **Dual Operating Modes**:
  - **VPN (TUN)**: Full-system virtual adapter routing all apps and games.
  - **System Proxy**: System-wide HTTP & SOCKS5 proxy configuration.
- **Leak Protection & Kill Switch**: Built-in firewall kill switch to prevent data, DNS, and IPv6 leaks.
- **Multi-Protocol**: Supports VLESS, WireGuard, Shadowsocks, Trojan, and SOCKS5.
- **Easy Import**: 1-click import from share links (`vless://`, `vmess://`, `ss://`, `trojan://`) or subscriptions.
- **Zero Logs**: No user activity is ever tracked or logged.

---

## 🚀 Quick Start

### Run Portable Executable
Download or launch the pre-compiled standalone binary:
```text
installer/aether-vpn-portable.exe
```

### Build from Source

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (1.90+)

```bash
# 1. Install frontend dependencies
npm install

# 2. Run in development mode
npm run dev

# 3. Build release executable
npm run build:portable
```

Deliverables will be generated in the `installer/` directory.

---

## 📄 License
MIT License.
