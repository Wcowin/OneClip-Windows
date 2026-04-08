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
mod shortcuts;
mod sync;

use tauri::{
    Manager,
    tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent},
};
use tauri_plugin_log::{Target, TargetKind};

fn main() {
    tauri::Builder::default()
        // 单实例支持 - 确保只有一个应用实例运行
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // 当尝试启动第二个实例时，显示主窗口
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        // 日志插件
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                ])
                .build(),
        )
        // 插件注册
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        
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
            commands::set_sync_directory,
            commands::get_sync_directory,
            commands::sync_now,
            commands::get_device_info,
            commands::set_autostart,
            commands::get_autostart,
            commands::update_note,
            commands::update_content,
            commands::cleanup_expired,
            commands::set_monitor_enabled,
            commands::get_monitor_enabled,
            commands::set_excluded_apps,
            commands::limit_history_count,
            commands::set_global_shortcuts,
            commands::check_for_updates,
            commands::download_and_install_update,
        ])
        
        // 应用启动设置
        .setup(|app| {
            // 初始化数据库
            let app_handle = app.handle().clone();
            if let Err(e) = database::init_database(&app_handle) {
                log::error!("数据库初始化失败: {}", e);
            }

            // 加载同步目录设置
            database::load_sync_directory(&app_handle);

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

            // 注册全局快捷键（支持从设置动态更新）
            use tauri_plugin_global_shortcut::ShortcutState;
            let app_handle_shortcut = app.handle().clone();
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |_app, shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            shortcuts::handle_shortcut(&app_handle_shortcut, shortcut, event.state);
                        }
                    })
                    .build(),
            )?;
            match shortcuts::setup_shortcuts(&app.handle().clone()) {
                Ok(_) => log::info!("全局快捷键已注册（支持动态配置）"),
                Err(e) => log::warn!("注册全局快捷键失败: {}", e),
            }

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
