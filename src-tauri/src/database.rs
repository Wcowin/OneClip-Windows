//
//  database.rs
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  SQLite 数据库模块 - 直接读取 macOS 版数据库
//

use rusqlite::{Connection, Result, params};
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use std::sync::Mutex;
use crate::clipboard::{ClipboardItem, ClipboardItemType};

// 全局同步目录配置
static SYNC_DIRECTORY: Mutex<Option<PathBuf>> = Mutex::new(None);

/// 设置同步目录（迁移日期文件夹和 changes.jsonl，数据库保持本地）
pub fn set_sync_directory(app_handle: &AppHandle, path: &str) -> Result<(), String> {
    let new_dir = PathBuf::from(path);

    // 确保目录存在
    if !new_dir.exists() {
        std::fs::create_dir_all(&new_dir)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }

    // 获取本地数据目录
    let local_dir = get_local_data_dir(app_handle);

    // 迁移数据到新目录（如果是不同目录）
    if local_dir != new_dir {
        if let Ok(entries) = std::fs::read_dir(&local_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                let src_path = entry.path();

                // 迁移日期文件夹（图片）
                if name.len() == 10 && name.chars().nth(4) == Some('-') && src_path.is_dir() {
                    let dst_folder = new_dir.join(&name);
                    if !dst_folder.exists() {
                        copy_dir_all(&src_path, &dst_folder).ok();
                        log::info!("已迁移图片文件夹: {}", name);
                    }
                }

                // 迁移 changes.jsonl
                if name == "changes.jsonl" && src_path.is_file() {
                    let dst_file = new_dir.join(&name);
                    if !dst_file.exists() {
                        std::fs::copy(&src_path, &dst_file).ok();
                        log::info!("已迁移 changes.jsonl");
                    }
                }

                // 迁移 QuickReplyFiles 目录
                if name == "QuickReplyFiles" && src_path.is_dir() {
                    let dst_folder = new_dir.join(&name);
                    if !dst_folder.exists() {
                        copy_dir_all(&src_path, &dst_folder).ok();
                        log::info!("已迁移 QuickReplyFiles");
                    }
                }
            }
        }
    }

    // 保存设置到数据库
    if let Ok(conn) = get_connection(app_handle) {
        let _ = conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_directory', ?1)",
            [path],
        );
    }

    // 更新全局配置
    let mut dir = SYNC_DIRECTORY.lock().unwrap();
    *dir = Some(new_dir);

    Ok(())
}

/// 加载同步目录设置（启动时调用）
pub fn load_sync_directory(app_handle: &AppHandle) {
    if let Ok(conn) = get_connection(app_handle) {
        if let Ok(path) = conn.query_row::<String, _, _>(
            "SELECT value FROM settings WHERE key = 'sync_directory'",
            [],
            |row| row.get(0),
        ) {
            if !path.is_empty() {
                let mut dir = SYNC_DIRECTORY.lock().unwrap();
                *dir = Some(PathBuf::from(path));
                log::info!("已加载同步目录设置");
            }
        }
    }
}

/// 递归复制目录
fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// 获取同步目录
pub fn get_sync_directory() -> Option<PathBuf> {
    SYNC_DIRECTORY.lock().unwrap().clone()
}

/// 获取数据库路径（始终在本地默认位置）
fn get_database_path(app_handle: &AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("无法获取应用数据目录");

    std::fs::create_dir_all(&app_data_dir).ok();
    app_data_dir.join("clipboard.db")
}

/// 获取本地数据目录
pub fn get_local_data_dir(app_handle: &AppHandle) -> PathBuf {
    app_handle.path().app_data_dir().expect("无法获取应用数据目录")
}

/// 获取图片存储目录（日期文件夹）
pub fn get_image_directory() -> Option<PathBuf> {
    let sync_dir = get_sync_directory()?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let dir = sync_dir.join(&today);
    std::fs::create_dir_all(&dir).ok();
    Some(dir)
}

/// 初始化数据库
/// 如果是新数据库，创建兼容 Mac 版的表结构
pub fn init_database(app_handle: &AppHandle) -> Result<()> {
    let db_path = get_database_path(app_handle);
    let conn = Connection::open(&db_path)?;

    // 创建兼容 Mac 版的表结构
    conn.execute(
        "CREATE TABLE IF NOT EXISTS clipboard_items (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT,
            content TEXT,
            timestamp REAL NOT NULL,
            source_app TEXT,
            source_bundle_id TEXT,
            is_pinned INTEGER DEFAULT 0,
            is_favorite INTEGER DEFAULT 0,
            is_content_edited INTEGER DEFAULT 0,
            content_hash TEXT,
            file_path TEXT,
            rtf_path TEXT,
            rtf_data BLOB,
            smart_category TEXT,
            sequence_number INTEGER DEFAULT 0,
            display_version INTEGER DEFAULT 0,
            created_at REAL DEFAULT (julianday('now')),
            updated_at REAL DEFAULT (julianday('now')),
            data BLOB,
            is_synced INTEGER DEFAULT 0,
            source_device_id TEXT,
            source_device_name TEXT
        )",
        [],
    )?;

    // 创建索引
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

    log::info!("数据库初始化完成: {:?}", db_path);
    Ok(())
}

/// 获取数据库连接
pub fn get_connection(app_handle: &AppHandle) -> Result<Connection> {
    let db_path = get_database_path(app_handle);
    Connection::open(&db_path)
}

/// 将 Julian Day 转换为毫秒时间戳
fn julian_to_millis(julian: f64) -> i64 {
    // Julian Day 2440587.5 = Unix epoch (1970-01-01 00:00:00)
    ((julian - 2440587.5) * 86400.0 * 1000.0) as i64
}

/// 将毫秒时间戳转换为 Julian Day
fn millis_to_julian(millis: i64) -> f64 {
    (millis as f64 / 1000.0 / 86400.0) + 2440587.5
}

/// 获取所有剪贴板项目（兼容 Mac 版数据库）
pub fn get_all_items(conn: &Connection, limit: i32) -> Result<Vec<ClipboardItem>> {
    // 使用兼容 Mac 版的查询
    let mut stmt = conn.prepare(
        "SELECT id, type, title, content, timestamp, source_app,
                is_pinned, is_favorite, file_path, smart_category
         FROM clipboard_items
         ORDER BY is_pinned DESC, timestamp DESC
         LIMIT ?1"
    )?;

    let items = stmt.query_map([limit], |row| {
        let id: String = row.get(0)?;
        let type_str: String = row.get(1)?;
        let title: Option<String> = row.get(2)?;
        let content: Option<String> = row.get(3)?;
        let timestamp: f64 = row.get(4)?;
        let source_app: Option<String> = row.get(5)?;
        let is_pinned: i32 = row.get(6)?;
        let is_favorite: i32 = row.get(7)?;
        let file_path: Option<String> = row.get(8)?;
        let category: Option<String> = row.get(9)?;

        // 转换类型
        let item_type = match type_str.as_str() {
            "text" => ClipboardItemType::Text,
            "image" => ClipboardItemType::Image,
            "file" | "files" => ClipboardItemType::File,
            "url" => ClipboardItemType::Url,
            "color" => ClipboardItemType::Color,
            "rtf" => ClipboardItemType::Rtf,
            _ => ClipboardItemType::Text,
        };

        // 内容：优先用 content，否则用 title
        let display_content = content.unwrap_or_else(|| title.clone().unwrap_or_default());

        // 图片路径处理
        let (image_path, thumbnail_path) = if item_type == ClipboardItemType::Image {
            if let Some(ref fp) = file_path {
                let thumb = fp.replace(".png", "_thumb.jpg")
                              .replace(".jpg", "_thumb.jpg");
                (Some(fp.clone()), Some(thumb))
            } else {
                (None, None)
            }
        } else {
            (None, None)
        };

        Ok(ClipboardItem {
            id,
            item_type,
            content: display_content,
            preview: title,
            timestamp: julian_to_millis(timestamp),
            source_app,
            is_pinned: is_pinned != 0,
            is_favorite: is_favorite != 0,
            is_quick_reply: false,
            category,
            note: None,
            image_width: None,
            image_height: None,
            image_path,
            thumbnail_path,
            file_name: None,
            file_size: None,
            file_path,
            color_hex: None,
            color_rgb: None,
            url_title: None,
            url_favicon: None,
        })
    })?;

    items.collect()
}

/// 插入剪贴板项目（兼容 Mac 版格式）
pub fn insert_item(conn: &Connection, item: &ClipboardItem) -> Result<()> {
    let item_type = match item.item_type {
        ClipboardItemType::Text => "text",
        ClipboardItemType::Image => "image",
        ClipboardItemType::File => "file",
        ClipboardItemType::Url => "url",
        ClipboardItemType::Color => "color",
        ClipboardItemType::Rtf => "rtf",
    };

    let timestamp_julian = millis_to_julian(item.timestamp);

    conn.execute(
        "INSERT OR REPLACE INTO clipboard_items (
            id, type, title, content, timestamp, source_app,
            is_pinned, is_favorite, file_path, smart_category
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            item.id,
            item_type,
            item.preview,
            item.content,
            timestamp_julian,
            item.source_app,
            item.is_pinned as i32,
            item.is_favorite as i32,
            item.file_path,
            item.category,
        ],
    )?;

    Ok(())
}

/// 删除剪贴板项目
pub fn delete_item(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM clipboard_items WHERE id = ?1", [id])?;
    Ok(())
}

/// 更新置顶状态
pub fn update_pinned(conn: &Connection, id: &str, is_pinned: bool) -> Result<()> {
    conn.execute(
        "UPDATE clipboard_items SET is_pinned = ?1, updated_at = julianday('now') WHERE id = ?2",
        params![is_pinned as i32, id],
    )?;
    Ok(())
}

/// 更新收藏状态
pub fn update_favorite(conn: &Connection, id: &str, is_favorite: bool) -> Result<()> {
    conn.execute(
        "UPDATE clipboard_items SET is_favorite = ?1, updated_at = julianday('now') WHERE id = ?2",
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

/// 更新备注
pub fn update_note(conn: &Connection, id: &str, note: Option<&str>) -> Result<()> {
    conn.execute(
        "UPDATE clipboard_items SET updated_at = julianday('now') WHERE id = ?1",
        params![id],
    )?;
    // 使用单独的语句处理 note，因为它可能是 NULL
    if let Some(n) = note {
        conn.execute(
            "UPDATE clipboard_items SET title = ?1 WHERE id = ?2",
            params![n, id],
        )?;
    } else {
        conn.execute(
            "UPDATE clipboard_items SET title = NULL WHERE id = ?1",
            params![id],
        )?;
    }
    Ok(())
}

/// 更新内容
pub fn update_content(conn: &Connection, id: &str, content: &str) -> Result<()> {
    conn.execute(
        "UPDATE clipboard_items SET content = ?1, is_content_edited = 1, updated_at = julianday('now') WHERE id = ?2",
        params![content, id],
    )?;
    Ok(())
}

/// 清理过期记录（保留置顶和收藏）
/// 返回删除的记录数
pub fn cleanup_expired(conn: &Connection, days: i32) -> Result<i32> {
    // 计算过期时间点（Julian Day）
    let cutoff_julian = millis_to_julian(
        chrono::Utc::now().timestamp_millis() - (days as i64 * 24 * 60 * 60 * 1000)
    );
    let deleted = conn.execute(
        "DELETE FROM clipboard_items
         WHERE is_pinned = 0 AND is_favorite = 0
         AND timestamp < ?1",
        params![cutoff_julian],
    )?;
    log::info!("清理了 {} 条过期记录（超过 {} 天）", deleted, days);
    Ok(deleted as i32)
}

/// 限制历史记录数量（保留置顶和收藏）
/// 返回删除的记录数
pub fn limit_history_count(conn: &Connection, max_count: i32) -> Result<i32> {
    // 获取当前非置顶非收藏的记录数
    let current_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM clipboard_items WHERE is_pinned = 0 AND is_favorite = 0",
        [],
        |row| row.get(0),
    )?;

    if current_count <= max_count {
        return Ok(0);
    }

    let to_delete = current_count - max_count;

    // 删除最旧的记录
    let deleted = conn.execute(
        "DELETE FROM clipboard_items WHERE id IN (
            SELECT id FROM clipboard_items
            WHERE is_pinned = 0 AND is_favorite = 0
            ORDER BY timestamp ASC
            LIMIT ?1
        )",
        params![to_delete],
    )?;

    log::info!("限制历史数量：删除了 {} 条旧记录", deleted);
    Ok(deleted as i32)
}
