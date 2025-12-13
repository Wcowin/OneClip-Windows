//
//  database.rs
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  SQLite 数据库模块 - 与 macOS 版数据结构兼容
//

use rusqlite::{Connection, Result, params};
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use crate::clipboard::{ClipboardItem, ClipboardItemType};

/// 获取数据库路径
fn get_database_path(app_handle: &AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("无法获取应用数据目录");
    
    // 确保目录存在
    std::fs::create_dir_all(&app_data_dir).ok();
    
    app_data_dir.join("oneclip.db")
}

/// 初始化数据库
pub fn init_database(app_handle: &AppHandle) -> Result<()> {
    let db_path = get_database_path(app_handle);
    let conn = Connection::open(&db_path)?;
    
    // 创建剪贴板历史表 - 与 macOS 版结构兼容
    conn.execute(
        "CREATE TABLE IF NOT EXISTS clipboard_items (
            id TEXT PRIMARY KEY,
            item_type TEXT NOT NULL,
            content TEXT NOT NULL,
            preview TEXT,
            timestamp INTEGER NOT NULL,
            source_app TEXT,
            is_pinned INTEGER DEFAULT 0,
            is_favorite INTEGER DEFAULT 0,
            is_quick_reply INTEGER DEFAULT 0,
            category TEXT,
            image_width INTEGER,
            image_height INTEGER,
            image_path TEXT,
            thumbnail_path TEXT,
            file_name TEXT,
            file_size INTEGER,
            file_path TEXT,
            color_hex TEXT,
            color_rgb TEXT,
            url_title TEXT,
            url_favicon TEXT
        )",
        [],
    )?;
    
    // 创建索引以提高查询性能
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_timestamp ON clipboard_items(timestamp DESC)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_is_pinned ON clipboard_items(is_pinned)",
        [],
    )?;
    
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_is_favorite ON clipboard_items(is_favorite)",
        [],
    )?;
    
    // 创建设置表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;
    
    // 创建快捷回复表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS quick_replies (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            category TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;
    
    log::info!("数据库初始化完成: {:?}", db_path);
    Ok(())
}

/// 获取数据库连接
pub fn get_connection(app_handle: &AppHandle) -> Result<Connection> {
    let db_path = get_database_path(app_handle);
    Connection::open(&db_path)
}

/// 插入剪贴板项目
pub fn insert_item(conn: &Connection, item: &ClipboardItem) -> Result<()> {
    let item_type = match item.item_type {
        ClipboardItemType::Text => "text",
        ClipboardItemType::Image => "image",
        ClipboardItemType::File => "file",
        ClipboardItemType::Url => "url",
        ClipboardItemType::Color => "color",
        ClipboardItemType::Rtf => "rtf",
    };
    
    conn.execute(
        "INSERT OR REPLACE INTO clipboard_items (
            id, item_type, content, preview, timestamp, source_app,
            is_pinned, is_favorite, is_quick_reply, category,
            image_width, image_height, image_path, thumbnail_path,
            file_name, file_size, file_path,
            color_hex, color_rgb, url_title, url_favicon
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21
        )",
        params![
            item.id,
            item_type,
            item.content,
            item.preview,
            item.timestamp,
            item.source_app,
            item.is_pinned as i32,
            item.is_favorite as i32,
            item.is_quick_reply as i32,
            item.category,
            item.image_width,
            item.image_height,
            item.image_path,
            item.thumbnail_path,
            item.file_name,
            item.file_size.map(|s| s as i64),
            item.file_path,
            item.color_hex,
            item.color_rgb,
            item.url_title,
            item.url_favicon,
        ],
    )?;
    
    Ok(())
}

/// 获取所有剪贴板项目
pub fn get_all_items(conn: &Connection, limit: i32) -> Result<Vec<ClipboardItem>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM clipboard_items 
         ORDER BY is_pinned DESC, timestamp DESC 
         LIMIT ?1"
    )?;
    
    let items = stmt.query_map([limit], |row| {
        let item_type_str: String = row.get(1)?;
        let item_type = match item_type_str.as_str() {
            "text" => ClipboardItemType::Text,
            "image" => ClipboardItemType::Image,
            "file" => ClipboardItemType::File,
            "url" => ClipboardItemType::Url,
            "color" => ClipboardItemType::Color,
            "rtf" => ClipboardItemType::Rtf,
            _ => ClipboardItemType::Text,
        };
        
        Ok(ClipboardItem {
            id: row.get(0)?,
            item_type,
            content: row.get(2)?,
            preview: row.get(3)?,
            timestamp: row.get(4)?,
            source_app: row.get(5)?,
            is_pinned: row.get::<_, i32>(6)? != 0,
            is_favorite: row.get::<_, i32>(7)? != 0,
            is_quick_reply: row.get::<_, i32>(8)? != 0,
            category: row.get(9)?,
            image_width: row.get(10)?,
            image_height: row.get(11)?,
            image_path: row.get(12)?,
            thumbnail_path: row.get(13)?,
            file_name: row.get(14)?,
            file_size: row.get::<_, Option<i64>>(15)?.map(|s| s as u64),
            file_path: row.get(16)?,
            color_hex: row.get(17)?,
            color_rgb: row.get(18)?,
            url_title: row.get(19)?,
            url_favicon: row.get(20)?,
        })
    })?;
    
    items.collect()
}

/// 删除剪贴板项目
pub fn delete_item(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM clipboard_items WHERE id = ?1", [id])?;
    Ok(())
}

/// 更新置顶状态
pub fn update_pinned(conn: &Connection, id: &str, is_pinned: bool) -> Result<()> {
    conn.execute(
        "UPDATE clipboard_items SET is_pinned = ?1 WHERE id = ?2",
        params![is_pinned as i32, id],
    )?;
    Ok(())
}

/// 更新收藏状态
pub fn update_favorite(conn: &Connection, id: &str, is_favorite: bool) -> Result<()> {
    conn.execute(
        "UPDATE clipboard_items SET is_favorite = ?1 WHERE id = ?2",
        params![is_favorite as i32, id],
    )?;
    Ok(())
}

/// 清空历史（保留置顶和收藏）
pub fn clear_history(conn: &Connection) -> Result<()> {
    conn.execute(
        "DELETE FROM clipboard_items WHERE is_pinned = 0 AND is_favorite = 0",
        [],
    )?;
    Ok(())
}
