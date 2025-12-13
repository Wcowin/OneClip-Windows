//
//  sync.rs
//  OneClip Windows
//
//  云同步引擎 - 与 macOS 版兼容
//  通过 changes.jsonl 实现增量同步
//

use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use crate::clipboard::{ClipboardItem, ClipboardItemType};
use crate::database;

/// 变更操作类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChangeOperation {
    Insert,
    Update,
    Delete,
    Favorite,
    Pin,
}

/// 同步变更记录（与 Mac 版兼容）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncChange {
    pub id: String,
    #[serde(rename = "item_id")]
    pub item_id: String,
    #[serde(rename = "op")]
    pub operation: ChangeOperation,
    #[serde(rename = "ts")]
    pub timestamp: i64,  // 毫秒时间戳
    #[serde(rename = "device")]
    pub device_id: String,
    #[serde(rename = "device_name")]
    pub device_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<ClipboardItem>,
    #[serde(rename = "isFavorite", skip_serializing_if = "Option::is_none")]
    pub is_favorite: Option<bool>,
    #[serde(rename = "isPinned", skip_serializing_if = "Option::is_none")]
    pub is_pinned: Option<bool>,
}

/// 获取设备 ID
pub fn get_device_id() -> String {
    let name = get_device_name();
    format!("win-{:x}", md5_hash(&name))
}

/// 获取设备名称
pub fn get_device_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Windows-PC".to_string())
}

/// 简单的字符串哈希
fn md5_hash(s: &str) -> u64 {
    let mut hash: u64 = 0;
    for byte in s.bytes() {
        hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
    }
    hash
}

/// 获取 changes.jsonl 路径
fn get_changes_file_path() -> Option<PathBuf> {
    database::get_sync_directory().map(|dir| dir.join("changes.jsonl"))
}

/// 记录变更到 changes.jsonl
pub fn record_change(
    item_id: &str,
    operation: ChangeOperation,
    data: Option<&ClipboardItem>,
    is_favorite: Option<bool>,
    is_pinned: Option<bool>,
) -> Result<(), String> {
    let changes_file = match get_changes_file_path() {
        Some(path) => path,
        None => return Ok(()), // 未设置同步目录，跳过
    };

    // 只同步文本和图片
    if let Some(item) = data {
        match item.item_type {
            ClipboardItemType::Text | ClipboardItemType::Image => {}
            _ => return Ok(()), // 跳过其他类型
        }
    }

    let change = SyncChange {
        id: uuid::Uuid::new_v4().to_string(),
        item_id: item_id.to_string(),
        operation,
        timestamp: chrono::Utc::now().timestamp_millis(),
        device_id: get_device_id(),
        device_name: Some(get_device_name()),
        data: data.cloned(),
        is_favorite,
        is_pinned,
    };

    // 追加到 changes.jsonl
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&changes_file)
        .map_err(|e| format!("无法打开 changes.jsonl: {}", e))?;

    let json = serde_json::to_string(&change)
        .map_err(|e| format!("JSON 序列化失败: {}", e))?;

    writeln!(file, "{}", json)
        .map_err(|e| format!("写入 changes.jsonl 失败: {}", e))?;

    log::debug!("记录变更: {:?} for {}", change.operation, item_id);
    Ok(())
}

/// 应用远程变更
pub fn apply_remote_changes(app_handle: &AppHandle) -> Result<i32, String> {
    let changes_file = match get_changes_file_path() {
        Some(path) => path,
        None => return Ok(0),
    };

    if !changes_file.exists() {
        return Ok(0);
    }

    let conn = database::get_connection(app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    // 获取最后同步时间戳
    let last_sync_ts: i64 = conn
        .query_row(
            "SELECT COALESCE(CAST(value AS INTEGER), 0) FROM settings WHERE key = 'last_sync_ts'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let file = File::open(&changes_file)
        .map_err(|e| format!("无法打开 changes.jsonl: {}", e))?;
    let reader = BufReader::new(file);

    let device_id = get_device_id();
    let mut applied_count = 0;

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };

        if line.trim().is_empty() {
            continue;
        }

        let change: SyncChange = match serde_json::from_str(&line) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // 跳过本设备的变更
        if change.device_id == device_id {
            continue;
        }

        // 跳过已处理的变更
        if change.timestamp <= last_sync_ts {
            continue;
        }

        // 应用变更
        if let Err(e) = apply_single_change(&conn, &change) {
            log::warn!("应用变更失败: {}", e);
            continue;
        }

        applied_count += 1;
    }

    // 更新最后同步时间戳
    if applied_count > 0 {
        let now = chrono::Utc::now().timestamp_millis();
        let _ = conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('last_sync_ts', ?1)",
            [now.to_string()],
        );
        log::info!("已应用 {} 条远程变更", applied_count);
    }

    Ok(applied_count)
}

/// 应用单个变更
fn apply_single_change(conn: &rusqlite::Connection, change: &SyncChange) -> Result<(), String> {
    match change.operation {
        ChangeOperation::Insert | ChangeOperation::Update => {
            if let Some(item) = &change.data {
                // 只同步文本和图片
                match item.item_type {
                    ClipboardItemType::Text | ClipboardItemType::Image => {}
                    _ => return Ok(()),
                }
                database::insert_item(conn, item)
                    .map_err(|e| format!("插入项目失败: {}", e))?;
            }
        }
        ChangeOperation::Delete => {
            database::delete_item(conn, &change.item_id)
                .map_err(|e| format!("删除项目失败: {}", e))?;
        }
        ChangeOperation::Favorite => {
            if let Some(is_favorite) = change.is_favorite {
                database::update_favorite(conn, &change.item_id, is_favorite)
                    .map_err(|e| format!("更新收藏状态失败: {}", e))?;
            }
        }
        ChangeOperation::Pin => {
            if let Some(is_pinned) = change.is_pinned {
                database::update_pinned(conn, &change.item_id, is_pinned)
                    .map_err(|e| format!("更新置顶状态失败: {}", e))?;
            }
        }
    }
    Ok(())
}
