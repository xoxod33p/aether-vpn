pub mod commands;
pub mod core;
pub mod models;
pub mod storage;
pub mod protocols;
pub mod network;

use commands::*;
use core::ConnectionManager;
use storage::Database;
#[allow(unused_imports)]
use tauri::Manager;
use tracing_subscriber::EnvFilter;

#[cfg(windows)]
fn enforce_single_instance() -> bool {
    use std::ffi::c_void;
    unsafe extern "system" {
        fn CreateMutexW(lpMutexAttributes: *mut c_void, bInitialOwner: i32, lpName: *const u16) -> *mut c_void;
        fn GetLastError() -> u32;
        fn FindWindowW(lpClassName: *const u16, lpWindowName: *const u16) -> *mut c_void;
        fn SetForegroundWindow(hWnd: *mut c_void) -> i32;
        fn ShowWindow(hWnd: *mut c_void, nCmdShow: i32) -> i32;
    }
    const ERROR_ALREADY_EXISTS: u32 = 183;
    let name: Vec<u16> = "Global\\AetherVPNSingleInstanceMutex\0".encode_utf16().collect();
    let handle = unsafe { CreateMutexW(std::ptr::null_mut(), 1, name.as_ptr()) };
    if handle.is_null() || unsafe { GetLastError() } == ERROR_ALREADY_EXISTS {
        let win_title: Vec<u16> = "AetherVPN\0".encode_utf16().collect();
        let hwnd = unsafe { FindWindowW(std::ptr::null(), win_title.as_ptr()) };
        if !hwnd.is_null() {
            unsafe {
                ShowWindow(hwnd, 9);
                SetForegroundWindow(hwnd);
            }
        }
        false
    } else {
        true
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(windows)]
    if !enforce_single_instance() {
        return;
    }

    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .try_init();

    tracing::info!("Initializing AetherVPN backend runtime...");
    core::ProcessManager::cleanup_virtual_adapters();

    let db = Database::new(None).expect("Failed to initialize SQLite database");
    let conn_mgr = ConnectionManager::new(db.clone());

    tauri::Builder::default()
        .setup(|_app| {
            #[cfg(desktop)]
            {
                let app = _app;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.center();
                    let icon_bytes = include_bytes!("../icons/icon.png");
                    if let Ok(icon) = tauri::image::Image::from_bytes(icon_bytes) {
                        let _ = window.set_icon(icon);
                    }
                }

                let icon_bytes = include_bytes!("../icons/icon.png");
                if let Ok(tray_icon_img) = tauri::image::Image::from_bytes(icon_bytes) {
                    let show_i = tauri::menu::MenuItem::with_id(app, "show", "Show AetherVPN", true, None::<&str>)?;
                    let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                    let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;

                    let _tray = tauri::tray::TrayIconBuilder::with_id("main-tray")
                        .icon(tray_icon_img)
                        .tooltip("AetherVPN")
                        .menu(&menu)
                        .show_menu_on_left_click(false)
                        .on_menu_event(|app, event| {
                            match event.id.as_ref() {
                                "quit" => {
                                    let conn_mgr = app.state::<ConnectionManager>();
                                    let mgr = conn_mgr.inner().clone();
                                    tauri::async_runtime::spawn(async move {
                                        let disconnect_fut = mgr.disconnect();
                                        tokio::select! {
                                            _ = disconnect_fut => {},
                                            _ = tokio::time::sleep(tokio::time::Duration::from_millis(1000)) => {},
                                        }
                                        core::ProcessManager::cleanup_virtual_adapters();
                                        std::process::exit(0);
                                    });
                                }
                                "show" => {
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.show();
                                        let _ = window.unminimize();
                                        let _ = window.set_focus();
                                    }
                                }
                                _ => {}
                            }
                        })
                        .on_tray_icon_event(|tray, event| {
                            if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, button_state: tauri::tray::MouseButtonState::Up, .. } = event {
                                let app = tray.app_handle();
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        })
                        .build(app)?;
                }
            }

            Ok(())
        })
        .on_window_event(|_window, _event| {
            #[cfg(desktop)]
            if let tauri::WindowEvent::CloseRequested { api, .. } = _event {
                api.prevent_close();
                let _ = _window.hide();
                let conn_mgr = _window.state::<ConnectionManager>();
                let mgr = conn_mgr.inner().clone();
                tauri::async_runtime::spawn(async move {
                    let disconnect_fut = mgr.disconnect();
                    tokio::select! {
                        _ = disconnect_fut => {},
                        _ = tokio::time::sleep(tokio::time::Duration::from_millis(1000)) => {},
                    }
                    core::ProcessManager::cleanup_virtual_adapters();
                    std::process::exit(0);
                });
            }
        })
        .manage(db)
        .manage(conn_mgr)
        .invoke_handler(tauri::generate_handler![
            connect_vpn,
            disconnect_vpn,
            get_connection_status,
            get_traffic_stats,
            get_app_usages,
            get_profiles,
            save_profile,
            delete_profile,
            test_profile_latency,
            import_profile_link,
            sync_cloud_servers,
            get_settings,
            save_settings,
            get_dns_config,
            save_dns_config,
            minimize_window,
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
            check_for_updates,
            download_and_install_update,
            backup_database,
            get_device_id,
        ])
        .build(tauri::generate_context!())
        .expect("error while building AetherVPN application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
                core::ProcessManager::cleanup_virtual_adapters();
            }
        });
}
