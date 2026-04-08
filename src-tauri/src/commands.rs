//
//  commands.rs
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  Tauri 命令模块 - 前端调用的后端接口
//

use tauri::{AppHandle, Manager};
use tauri_plugin_updater::UpdaterExt;
use crate::clipboard::ClipboardItem;
use crate::database;
use crate::sync::ChangeOperation;

/// 获取剪贴板历史
#[tauri::command]
pub fn get_clipboard_history(app_handle: AppHandle, limit: Option<i32>) -> Result<Vec<ClipboardItem>, String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    let limit = limit.unwrap_or(1000);
    database::get_all_items(&conn, limit)
        .map_err(|e| format!("获取历史记录失败: {}", e))
}

/// 添加剪贴板项目
#[tauri::command]
pub fn add_clipboard_item(app_handle: AppHandle, item: ClipboardItem) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::insert_item(&conn, &item)
        .map_err(|e| format!("添加项目失败: {}", e))?;

    let _ = crate::sync::record_change(
        &item.id,
        ChangeOperation::Insert,
        Some(&item),
        None,
        None,
    );

    Ok(())
}

/// 删除剪贴板项目
#[tauri::command]
pub fn delete_clipboard_item(app_handle: AppHandle, id: String) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::delete_item(&conn, &id)
        .map_err(|e| format!("删除项目失败: {}", e))?;

    let _ = crate::sync::record_change(
        &id,
        ChangeOperation::Delete,
        None,
        None,
        None,
    );

    Ok(())
}

/// 切换置顶状态
#[tauri::command]
pub fn toggle_pin(app_handle: AppHandle, id: String, is_pinned: bool) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::update_pinned(&conn, &id, is_pinned)
        .map_err(|e| format!("更新置顶状态失败: {}", e))?;

    let _ = crate::sync::record_change(
        &id,
        ChangeOperation::Pin,
        None,
        None,
        Some(is_pinned),
    );

    Ok(())
}

/// 切换收藏状态
#[tauri::command]
pub fn toggle_favorite(app_handle: AppHandle, id: String, is_favorite: bool) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::update_favorite(&conn, &id, is_favorite)
        .map_err(|e| format!("更新收藏状态失败: {}", e))?;

    let _ = crate::sync::record_change(
        &id,
        ChangeOperation::Favorite,
        None,
        Some(is_favorite),
        None,
    );

    Ok(())
}

/// 清空历史
#[tauri::command]
pub fn clear_history(app_handle: AppHandle) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    let deleted_ids = database::get_clearable_item_ids(&conn)
        .map_err(|e| format!("查询待清理项目失败: {}", e))?;

    database::clear_history(&conn)
        .map_err(|e| format!("清空历史失败: {}", e))?;

    for id in deleted_ids {
        let _ = crate::sync::record_change(
            &id,
            ChangeOperation::Delete,
            None,
            None,
            None,
        );
    }

    Ok(())
}

/// 粘贴项目
#[tauri::command]
pub async fn paste_item(app_handle: AppHandle, content: String, item_type: String, image_path: Option<String>) -> Result<(), String> {
    let content_preview: String = content.chars().take(50).collect();
    log::info!("粘贴内容: {} (类型: {})",
        content_preview,
        item_type
    );

    // 1. 如果是图片类型，先将图片写入剪贴板
    #[cfg(target_os = "windows")]
    if item_type == "image" {
        if let Some(ref path) = image_path {
            if let Err(e) = write_image_to_clipboard(&app_handle, path) {
                log::error!("写入图片到剪贴板失败: {}", e);
                // 继续执行，可能图片已经在剪贴板中
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    let _ = &image_path;

    // 2. 隐藏窗口
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.hide();
    }

    // 3. 执行粘贴（聚焦上一个窗口 + 模拟按键）
    crate::paste::do_paste();

    Ok(())
}

/// 将图片写入系统剪贴板 (Windows)
#[cfg(target_os = "windows")]
fn write_image_to_clipboard(app_handle: &AppHandle, relative_path: &str) -> Result<(), String> {
    use std::ptr;
    use winapi::um::winuser::*;
    use winapi::um::winbase::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    // 获取图片完整路径
    let full_path = if relative_path.starts_with('/') || relative_path.contains(':') {
        std::path::PathBuf::from(relative_path)
    } else {
        // 相对路径，拼接同步目录或本地目录
        if let Some(sync_dir) = database::get_sync_directory() {
            sync_dir.join(relative_path)
        } else {
            database::get_local_data_dir(app_handle).join(relative_path)
        }
    };

    log::info!("写入图片到剪贴板: {:?}", full_path);

    // 读取图片文件
    let img = image::open(&full_path)
        .map_err(|e| format!("打开图片失败: {}", e))?;
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    // 创建 DIB 数据
    let header_size = 40u32; // BITMAPINFOHEADER size
    let row_size = ((width * 4 + 3) / 4) * 4; // 4 字节对齐
    let pixel_size = row_size * height;
    let total_size = header_size as usize + pixel_size as usize;

    unsafe {
        // 分配全局内存
        let h_mem = GlobalAlloc(GMEM_MOVEABLE, total_size);
        if h_mem.is_null() {
            return Err("分配内存失败".to_string());
        }

        let ptr = GlobalLock(h_mem) as *mut u8;
        if ptr.is_null() {
            return Err("锁定内存失败".to_string());
        }

        // 写入 BITMAPINFOHEADER
        let header = ptr as *mut i32;
        *header.add(0) = 40;                    // biSize
        *header.add(1) = width as i32;          // biWidth
        *header.add(2) = -(height as i32);      // biHeight (负值表示自上而下)
        let header16 = ptr.add(12) as *mut i16;
        *header16 = 1;                          // biPlanes
        *header16.add(1) = 32;                  // biBitCount
        let header32 = ptr.add(16) as *mut i32;
        *header32 = 0;                          // biCompression (BI_RGB)

        // 写入像素数据 (BGRA 格式)
        let pixel_ptr = ptr.add(header_size as usize);
        for y in 0..height {
            for x in 0..width {
                let pixel = rgba.get_pixel(x, y);
                let offset = (y * row_size + x * 4) as usize;
                *pixel_ptr.add(offset) = pixel[2];     // B
                *pixel_ptr.add(offset + 1) = pixel[1]; // G
                *pixel_ptr.add(offset + 2) = pixel[0]; // R
                *pixel_ptr.add(offset + 3) = pixel[3]; // A
            }
        }

        GlobalUnlock(h_mem);

        // 写入剪贴板
        if OpenClipboard(ptr::null_mut()) == 0 {
            return Err("打开剪贴板失败".to_string());
        }

        EmptyClipboard();

        if SetClipboardData(CF_DIB, h_mem).is_null() {
            CloseClipboard();
            return Err("设置剪贴板数据失败".to_string());
        }

        CloseClipboard();
    }

    log::info!("图片已写入剪贴板");
    Ok(())
}

/// 获取设置
#[tauri::command]
pub fn get_settings(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    let mut stmt = conn.prepare("SELECT key, value FROM settings")
        .map_err(|e| format!("查询设置失败: {}", e))?;
    
    let settings: std::collections::HashMap<String, String> = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("读取设置失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    
    Ok(serde_json::json!(settings))
}

/// 保存设置
#[tauri::command]
pub fn save_settings(app_handle: AppHandle, key: String, value: String) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        [&key, &value],
    ).map_err(|e| format!("保存设置失败: {}", e))?;

    Ok(())
}

/// 设置同步目录并迁移数据
#[tauri::command]
pub fn set_sync_directory(app_handle: AppHandle, path: String) -> Result<(), String> {
    database::set_sync_directory(&app_handle, &path)?;
    log::info!("同步目录已设置: {}", path);
    Ok(())
}

/// 获取同步目录
#[tauri::command]
pub fn get_sync_directory() -> Option<String> {
    database::get_sync_directory().map(|p| p.to_string_lossy().to_string())
}

/// 执行同步（应用远程变更）
#[tauri::command]
pub fn sync_now(app_handle: AppHandle) -> Result<i32, String> {
    crate::sync::apply_remote_changes(&app_handle)
}

/// 获取设备信息
#[tauri::command]
pub fn get_device_info() -> serde_json::Value {
    serde_json::json!({
        "deviceId": crate::sync::get_device_id(),
        "deviceName": crate::sync::get_device_name()
    })
}

/// 设置开机自启动
#[tauri::command]
pub fn set_autostart(app_handle: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app_handle.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())?;
    } else {
        manager.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 获取开机自启动状态
#[tauri::command]
pub fn get_autostart(app_handle: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app_handle.autolaunch().is_enabled().map_err(|e| e.to_string())
}

/// 更新备注
#[tauri::command]
pub fn update_note(app_handle: AppHandle, id: String, note: Option<String>) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    database::update_note(&conn, &id, note.as_deref())
        .map_err(|e| format!("更新备注失败: {}", e))?;

    if let Ok(Some(item)) = database::get_item_by_id(&conn, &id) {
        let _ = crate::sync::record_change(
            &id,
            ChangeOperation::Update,
            Some(&item),
            None,
            None,
        );
    }

    Ok(())
}

/// 更新内容（编辑功能）
#[tauri::command]
pub fn update_content(app_handle: AppHandle, id: String, content: String) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    database::update_content(&conn, &id, &content)
        .map_err(|e| format!("更新内容失败: {}", e))?;

    if let Ok(Some(item)) = database::get_item_by_id(&conn, &id) {
        let _ = crate::sync::record_change(
            &id,
            ChangeOperation::Update,
            Some(&item),
            None,
            None,
        );
    }

    Ok(())
}

/// 清理过期记录（借鉴 EcoPaste 的 Duration 功能）
#[tauri::command]
pub fn cleanup_expired(app_handle: AppHandle, days: i32) -> Result<i32, String> {
    if days <= 0 {
        return Ok(0);
    }

    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    let deleted_ids = database::get_expired_item_ids(&conn, days)
        .map_err(|e| format!("查询过期项目失败: {}", e))?;

    let deleted = database::cleanup_expired(&conn, days)
        .map_err(|e| format!("清理过期记录失败: {}", e))?;

    for id in deleted_ids {
        let _ = crate::sync::record_change(
            &id,
            ChangeOperation::Delete,
            None,
            None,
            None,
        );
    }

    Ok(deleted)
}

/// 设置剪贴板监控开关
#[tauri::command]
pub fn set_monitor_enabled(enabled: bool) {
    crate::clipboard::set_monitor_enabled(enabled);
}

/// 获取剪贴板监控状态
#[tauri::command]
pub fn get_monitor_enabled() -> bool {
    crate::clipboard::is_monitor_enabled()
}

/// 设置排除的应用列表
#[tauri::command]
pub fn set_excluded_apps(apps: Vec<String>) {
    crate::clipboard::set_excluded_apps(apps);
}

/// 限制历史记录数量
#[tauri::command]
pub fn limit_history_count(app_handle: AppHandle, max_count: i32) -> Result<i32, String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    let deleted_ids = database::get_overflow_item_ids(&conn, max_count)
        .map_err(|e| format!("查询超限项目失败: {}", e))?;

    let deleted = database::limit_history_count(&conn, max_count)
        .map_err(|e| format!("限制历史数量失败: {}", e))?;

    for id in deleted_ids {
        let _ = crate::sync::record_change(
            &id,
            ChangeOperation::Delete,
            None,
            None,
            None,
        );
    }

    Ok(deleted)
}

/// 设置全局快捷键（主窗口 + 快速粘贴）
#[tauri::command]
pub fn set_global_shortcuts(
    app_handle: AppHandle,
    global_shortcut: String,
    quick_paste_shortcut: String,
) -> Result<(), String> {
    crate::shortcuts::update_shortcuts(&app_handle, global_shortcut, quick_paste_shortcut)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub available: bool,
    pub version: Option<String>,
    pub current_version: Option<String>,
    pub notes: Option<String>,
}

/// 检查应用更新（GitHub Releases / latest.json）
#[tauri::command]
pub async fn check_for_updates(app_handle: AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app_handle.package_info().version.to_string();
    let updater = app_handle
        .updater()
        .map_err(|e| format!("初始化更新器失败: {}", e))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("检查更新失败: {}", e))?;

    if let Some(update) = update {
        Ok(UpdateCheckResult {
            available: true,
            version: Some(update.version.clone()),
            current_version: Some(update.current_version.clone()),
            notes: update.body.clone(),
        })
    } else {
        Ok(UpdateCheckResult {
            available: false,
            version: None,
            current_version: Some(current_version),
            notes: None,
        })
    }
}

/// 下载并安装更新
#[tauri::command]
pub async fn download_and_install_update(app_handle: AppHandle) -> Result<(), String> {
    let updater = app_handle
        .updater()
        .map_err(|e| format!("初始化更新器失败: {}", e))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("检查更新失败: {}", e))?;

    let Some(update) = update else {
        return Ok(());
    };

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| format!("下载或安装更新失败: {}", e))?;

    Ok(())
}
