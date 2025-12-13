//
//  commands.rs
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  Tauri 命令模块 - 前端调用的后端接口
//

use tauri::{AppHandle, Manager};
use crate::clipboard::ClipboardItem;
use crate::database;

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
        .map_err(|e| format!("添加项目失败: {}", e))
}

/// 删除剪贴板项目
#[tauri::command]
pub fn delete_clipboard_item(app_handle: AppHandle, id: String) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::delete_item(&conn, &id)
        .map_err(|e| format!("删除项目失败: {}", e))
}

/// 切换置顶状态
#[tauri::command]
pub fn toggle_pin(app_handle: AppHandle, id: String, is_pinned: bool) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::update_pinned(&conn, &id, is_pinned)
        .map_err(|e| format!("更新置顶状态失败: {}", e))
}

/// 切换收藏状态
#[tauri::command]
pub fn toggle_favorite(app_handle: AppHandle, id: String, is_favorite: bool) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::update_favorite(&conn, &id, is_favorite)
        .map_err(|e| format!("更新收藏状态失败: {}", e))
}

/// 清空历史
#[tauri::command]
pub fn clear_history(app_handle: AppHandle) -> Result<(), String> {
    let conn = database::get_connection(&app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::clear_history(&conn)
        .map_err(|e| format!("清空历史失败: {}", e))
}

/// 粘贴项目
#[tauri::command]
pub async fn paste_item(app_handle: AppHandle, content: String, item_type: String) -> Result<(), String> {
    log::info!("粘贴内容: {} (类型: {})", 
        if content.len() > 50 { &content[..50] } else { &content },
        item_type
    );
    
    // 1. 将内容写入系统剪贴板
    // 使用 tauri-plugin-clipboard-manager 写入剪贴板
    // 这里通过前端调用插件 API 完成，后端只负责触发粘贴
    
    // 2. 隐藏窗口
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.hide();
    }
    
    // 3. 执行粘贴（聚焦上一个窗口 + 模拟按键）
    crate::paste::do_paste();
    
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
