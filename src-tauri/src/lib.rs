pub mod commands;
pub mod core;
pub mod models;
pub mod storage;
pub mod protocols;
pub mod network;

use commands::*;
use core::ConnectionManager;
use storage::Database;
use tracing_subscriber::EnvFilter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .try_init();

    tracing::info!("Initializing AetherVPN backend runtime...");

    let db = Database::new(None).expect("Failed to initialize SQLite database");
    let conn_mgr = ConnectionManager::new(db.clone());

    tauri::Builder::default()
        .manage(db)
        .manage(conn_mgr)
        .invoke_handler(tauri::generate_handler![
            connect_vpn,
            disconnect_vpn,
            get_connection_status,
            get_traffic_stats,
            get_profiles,
            save_profile,
            delete_profile,
            test_profile_latency,
            import_profile_link,
            get_settings,
            save_settings,
            get_dns_config,
            save_dns_config,
            get_subscriptions,
            save_subscription,
            update_subscription,
            delete_subscription,
            get_routing_rules,
            save_routing_rule,
            delete_routing_rule,
            get_logs,
            clear_logs,
            get_real_public_ip,
            run_dns_leak_test,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AetherVPN application");
}
