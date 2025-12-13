//
//  main.rs
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//

// 在 Windows 发布版本中隐藏控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod clipboard;
mod database;
mod commands;
mod paste;

use tauri::{
    Manager,
    tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent},
};

fn main() {
    // 初始化日志
    env_logger::init();

    tauri::Builder::default()
        // 插件注册
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_notification::init())
        
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            commands::get_clipboard_history,
            commands::add_clipboard_item,
            commands::delete_clipboard_item,
            commands::toggle_pin,
            commands::toggle_favorite,
            commands::clear_history,
            commands::paste_item,
            commands::get_settings,
            commands::save_settings,
        ])
        
        // 应用启动设置
        .setup(|app| {
            // 初始化数据库
            let app_handle = app.handle().clone();
            if let Err(e) = database::init_database(&app_handle) {
                log::error!("数据库初始化失败: {}", e);
            }

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("OneClip - 智能剪贴板")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        // 点击托盘图标显示/隐藏窗口
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // 启动窗口观察器（用于记录上一个活动窗口，粘贴时使用）
            paste::start_observer();

            // 启动剪贴板监控
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                clipboard::start_clipboard_monitor(app_handle);
            });

            log::info!("OneClip Windows 启动成功");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}
