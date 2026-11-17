# AetherVPN - Modern Cross-Platform VPN & Proxy Client in Rust

AetherVPN is a production-quality, high-performance cross-platform desktop VPN and proxy client written in Rust (Tauri 2) with a modern React 19 + TypeScript + Tailwind CSS interface. It uses **sing-box v1.11+** as its core networking engine, providing audited, cryptographic protocol implementations including VLESS (Reality & WebSocket), WireGuard, Shadowsocks, Trojan, and SOCKS5.

---

## 🌟 Key Features

- **Decoupled Architecture**: Strict separation of the UI presentation layer, application state management, SQLite persistent storage, and underlying networking daemon.
- **Dual Operating Modes**:
  - **TUN VPN Mode**: Creates a high-speed virtual network adapter (Wintun on Windows, TUN on Linux) routing all system packets through an encrypted outbound tunnel.
  - **System Proxy Mode**: Configures system-wide HTTP and SOCKS5 proxy settings with safe backup and restore on disconnect or crash.
- **Audited Protocols**: Modular configuration compiler supporting:
  - **VLESS** (Reality, XTLS, WebSocket, gRPC)
  - **WireGuard** (Kernel-compatible userspace WireGuard)
  - **Shadowsocks** (AEAD ciphers & Shadowsocks 2022 Blake3-AES/ChaCha)
  - **Trojan** (TLS multiplexing)
  - **SOCKS5 / HTTP Proxy**
- **Hardware-Accelerated Kill Switch**:
  - Windows: Automatic Windows Filtering Platform / `netsh advfirewall` rules that block all outbound traffic outside the VPN endpoint.
  - Linux: Dedicated `iptables` / `nftables` chains tagged for safe removal upon shutdown.
  - Leaves unrelated third-party firewall rules untouched.
- **Visual Routing Policy Engine**:
  - Rules based on Domain, Domain Suffix, IP CIDR, Country Code, Protocol, and Port.
  - Action policies: `Direct` (bypass VPN), `Proxy` (route via tunnel), or `Block` (ad & malware rejection).
- **DNS Leak Prevention & Encrypted Resolvers**:
  - Built-in DNS over HTTPS (DoH) and DNS over TLS (DoT) providers (Cloudflare, Quad9, Google, AdGuard, Custom).
  - High-priority DNS hijacking prevention ensuring ISP DNS cannot leak query logs.
- **Universal Subscription Synchronizer**:
  - Ingests and auto-updates subscriptions from **sing-box JSON**, **Clash YAML**, and **V2Ray share links** (`vless://`, `vmess://`, `trojan://`, `ss://`).
- **Telemetry & Diagnostics**:
  - Real-time traffic throughput and active connection counters queried directly from sing-box's Clash REST API on `127.0.0.1:9090`.
  - Sensitive credential redaction (UUIDs, private keys, passwords) in all structured tracing logs.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 + TypeScript                    │
│             (Tailwind CSS v4 + Lucide Icons)                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Tauri 2 IPC (Type-Safe JSON)
┌──────────────────────────────▼──────────────────────────────┐
│                      Rust Core Runtime                       │
│ ┌──────────────────┐ ┌──────────────────┐ ┌───────────────┐ │
│ │ ConnectionManager│ │  ProcessManager  │ │   Database    │ │
│ │  (State Machine) │ │(sing-box Monitor)│ │(SQLite Storage│ │
│ └────────┬─────────┘ └────────┬─────────┘ └───────┬───────┘ │
│          │                    │                   │         │
│          │                    ▼                   │         │
│          │         ┌──────────────────────┐       │         │
│          │         │ sing-box v1.11 Core  │◄──────┘         │
│          │         │(Wintun / Clash API)  │                 │
│          │         └──────────┬───────────┘                 │
│          ▼                    ▼                             │
│ ┌──────────────────┐ ┌──────────────────┐                   │
│ │  System Proxy    │ │   Kill Switch    │                   │
│ │(Windows Registry)│ │ (netsh/iptables) │                   │
│ └──────────────────┘ └──────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
vpn/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                 # Tauri application entrypoint
│   │   ├── lib.rs                  # Module registry and Tauri command dispatch
│   │   ├── commands/               # Tauri IPC command handlers
│   │   │   ├── connection.rs       # Connect/disconnect/status commands
│   │   │   ├── profiles.rs         # Profile CRUD and latency tester
│   │   │   ├── subscriptions.rs    # Subscription fetching and synchronization
│   │   │   ├── routing.rs          # Routing rule management
│   │   │   ├── settings.rs         # App and DNS settings
│   │   │   └── diagnostics.rs      # System logs and telemetry
│   │   ├── core/                   # Engine and lifecycle supervision
│   │   │   ├── connection_manager.rs # High-level VPN state machine
│   │   │   ├── process_manager.rs  # Asynchronous Tokio child process manager
│   │   │   └── traffic_monitor.rs  # Clash API REST client for live metrics
│   │   ├── models/                 # Strongly-typed Serde data models
│   │   ├── network/                # Operating system network modules
│   │   │   ├── system_proxy.rs     # Windows registry / Linux gsettings manager
│   │   │   ├── firewall.rs         # Windows netsh / Linux iptables kill switch
│   │   │   ├── latency.rs          # TCP 3-way handshake latency tester
│   │   │   └── subscription_parser.rs # V2Ray, Clash YAML, sing-box JSON parser
│   │   ├── protocols/              # Config compilation
│   │   │   └── singbox.rs          # Dynamic JSON builder for sing-box
│   │   └── storage/                # SQLite persistent database
│   │       └── database.rs         # rusqlite migrations, defaults, and CRUD
│   ├── tests/                      # Automated Rust integration test suites
│   ├── bin/                        # Platform-specific sing-box binary
│   └── tauri.conf.json             # Tauri 2 bundle and packaging configuration
├── src/                            # Frontend React 19 application
│   ├── components/                 # Layout (Sidebar, Topbar) & reusable UI
│   ├── pages/                      # 9 application pages
│   ├── services/                   # Tauri API IPC service wrapper
│   ├── stores/                     # State store hooks
│   ├── types/                      # TypeScript domain definitions
│   └── utils/                      # Formatting helpers
└── .github/workflows/              # Cross-platform CI/CD release workflow
```

---

## 🛠️ Building & Development

### Prerequisites

1. **Rust**: 1.85+ (`rustup update stable`)
2. **Node.js**: 20+ (`npm install`)
3. **C++ Build Tools**: MSVC on Windows (`Visual Studio Build Tools`), or `build-essential` on Linux.
4. **sing-box**: Placed at `src-tauri/bin/sing-box.exe` (Windows) or `src-tauri/bin/sing-box` (Linux).

### One-Click Build Script (`build.cmd`)

For Windows users, use [build.cmd](file:///C:/Users/xoxod33p/Desktop/vpn/build.cmd) to automate builds, dependency verification, and packaging:

```bat
:: 1. Build complete NSIS setup installer + portable binary (Default)
build.cmd

:: 2. Fast build: standalone release binary only (skips installer packaging)
build.cmd portable

:: 3. Run automated tests (frontend type-check + Rust test suite)
build.cmd test

:: 4. Start hot-reloading development server
build.cmd dev

:: 5. Clean all build artifacts
build.cmd clean
```

All final output binaries are deposited into the `installer\` directory:
- `installer\AetherVPN_0.1.0_x64-setup.exe` (NSIS Wizard Installer)
- `installer\aether-vpn-portable.exe` (Standalone Portable Binary)

---

### Running in Development

```bash
# Install frontend dependencies
npm install

# Start Vite dev server + Tauri 2 window
npm run tauri dev
```

### Running Backend Tests

The project includes an exhaustive automated test suite covering storage lifecycle, configuration compilation against the sing-box binary, and subscription link importers:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

All 11 tests will execute and validate:
- In-memory SQLite database migrations and defaults
- Profile CRUD operations
- ConnectionManager state transitions
- Real sing-box binary schema validation (`sing-box check -c <config>`)
- VLESS, Trojan, Shadowsocks, VMess link decoding
- Clash YAML and sing-box JSON configuration imports

### Packaging for Release

```bash
# Build production bundle
npm run tauri build
```

This generates:
- **Windows**: NSIS Installer (`.exe`), MSI Installer (`.msi`)
- **Linux**: Debian package (`.deb`), RPM package (`.rpm`), AppImage

---

## 🔒 Security Guidelines

- **Cryptographic Primitives**: Standard, audited cryptographic algorithms from the official sing-box engine are utilized. Custom cipher implementations are strictly prohibited.
- **Credential Storage**: Passwords, UUIDs, and WireGuard private keys are saved locally in the user's isolated local application data SQLite database.
- **Log Privacy**: Automatic pattern redactors sanitize authentication tokens and credentials prior to emitting trace events.
- **Non-destructive Firewalls**: The Kill Switch uses tagged rules (`AetherVPN_KS_*`) exclusively, ensuring system and user firewall rules remain intact upon disconnect.

---

## 📄 License

MIT License. Copyright (c) 2026 AetherVPN Team.
