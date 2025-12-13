//
//  clipboard.rs
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  剪贴板监控模块
//

use tauri::{AppHandle, Emitter, Manager};
use std::time::Duration;
use std::thread;
use std::sync::{Arc, Mutex};

/// 剪贴板项目类型
/// 使用小写序列化以匹配前端 TypeScript 类型
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ClipboardItemType {
    Text,
    Image,
    File,
    Url,
    Color,
    Rtf,
}

/// 剪贴板项目
/// 使用 serde rename 确保与前端 TypeScript 类型匹配（camelCase）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardItem {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: ClipboardItemType,
    pub content: String,
    pub preview: Option<String>,
    pub timestamp: i64,
    pub source_app: Option<String>,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub is_quick_reply: bool,
    pub category: Option<String>,
    
    // 图片相关
    pub image_width: Option<u32>,
    pub image_height: Option<u32>,
    pub image_path: Option<String>,
    pub thumbnail_path: Option<String>,
    
    // 文件相关
    pub file_name: Option<String>,
    pub file_size: Option<u64>,
    pub file_path: Option<String>,
    
    // 颜色相关
    pub color_hex: Option<String>,
    pub color_rgb: Option<String>,
    
    // 链接相关
    pub url_title: Option<String>,
    pub url_favicon: Option<String>,
}

impl ClipboardItem {
    /// 创建新的文本项目
    pub fn new_text(content: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            item_type: ClipboardItemType::Text,
            content: content.clone(),
            preview: if content.len() > 200 {
                Some(content.chars().take(200).collect())
            } else {
                None
            },
            timestamp: chrono::Utc::now().timestamp_millis(),
            source_app: None,
            is_pinned: false,
            is_favorite: false,
            is_quick_reply: false,
            category: None,
            image_width: None,
            image_height: None,
            image_path: None,
            thumbnail_path: None,
            file_name: None,
            file_size: None,
            file_path: None,
            color_hex: None,
            color_rgb: None,
            url_title: None,
            url_favicon: None,
        }
    }
    
    /// 检测是否为 URL
    pub fn detect_url(content: &str) -> bool {
        content.starts_with("http://") || 
        content.starts_with("https://") ||
        content.starts_with("ftp://")
    }
    
    /// 检测是否为颜色值
    pub fn detect_color(content: &str) -> Option<(String, String)> {
        let trimmed = content.trim();
        
        // 检测 #RRGGBB 格式
        if trimmed.starts_with('#') && trimmed.len() == 7 {
            if let Ok(_) = u32::from_str_radix(&trimmed[1..], 16) {
                let r = u8::from_str_radix(&trimmed[1..3], 16).unwrap_or(0);
                let g = u8::from_str_radix(&trimmed[3..5], 16).unwrap_or(0);
                let b = u8::from_str_radix(&trimmed[5..7], 16).unwrap_or(0);
                return Some((
                    trimmed.to_string(),
                    format!("rgb({}, {}, {})", r, g, b),
                ));
            }
        }
        
        None
    }
}

/// 剪贴板监控状态
pub struct ClipboardMonitor {
    last_content: Arc<Mutex<String>>,
    running: Arc<Mutex<bool>>,
}

impl ClipboardMonitor {
    pub fn new() -> Self {
        Self {
            last_content: Arc::new(Mutex::new(String::new())),
            running: Arc::new(Mutex::new(true)),
        }
    }
    
    /// 停止监控
    pub fn stop(&self) {
        if let Ok(mut running) = self.running.lock() {
            *running = false;
        }
    }
}

/// 启动剪贴板监控
/// 使用 tauri-plugin-clipboard-manager 插件读取剪贴板
pub fn start_clipboard_monitor(app_handle: AppHandle) {
    let last_content: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    
    log::info!("剪贴板监控已启动");
    
    loop {
        // 每 500ms 检查一次剪贴板
        thread::sleep(Duration::from_millis(500));
        
        // 使用 tauri-plugin-clipboard-manager 读取剪贴板文本
        // 注意：这需要在异步上下文中运行，这里使用同步方式
        let clipboard_text = read_clipboard_text(&app_handle);
        
        if let Some(new_content) = clipboard_text {
            let mut last = last_content.lock().unwrap();
            
            // 检测到新内容
            if !new_content.is_empty() && new_content != *last {
                *last = new_content.clone();
                
                // 创建剪贴板项目
                let item = create_clipboard_item(new_content);
                
                // 发送事件到前端
                if let Err(e) = app_handle.emit("clipboard-changed", &item) {
                    log::error!("发送剪贴板变化事件失败: {}", e);
                } else {
                    log::debug!("剪贴板变化: {:?}", item.item_type);
                }
                
                // 保存到数据库
                if let Err(e) = save_clipboard_item(&app_handle, &item) {
                    log::error!("保存剪贴板项目失败: {}", e);
                }
            }
        }
    }
}

/// 读取剪贴板文本内容
fn read_clipboard_text(app_handle: &AppHandle) -> Option<String> {
    // 使用 tauri-plugin-clipboard-manager 的 API
    // 由于插件是异步的，这里通过 Tauri 的状态管理来获取
    // 实际上在 Windows 上，我们需要使用 Win32 API 或者通过前端轮询
    
    // 方案：通过前端的 clipboard-manager 插件读取，然后通过命令传递
    // 这里返回 None，让前端负责监控
    // 后续可以添加 Windows 原生 API 支持
    
    None
}

/// 创建剪贴板项目
fn create_clipboard_item(content: String) -> ClipboardItem {
    // 检测内容类型
    if ClipboardItem::detect_url(&content) {
        // URL 类型
        ClipboardItem {
            id: uuid::Uuid::new_v4().to_string(),
            item_type: ClipboardItemType::Url,
            content: content.clone(),
            preview: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            source_app: None,
            is_pinned: false,
            is_favorite: false,
            is_quick_reply: false,
            category: None,
            image_width: None,
            image_height: None,
            image_path: None,
            thumbnail_path: None,
            file_name: None,
            file_size: None,
            file_path: None,
            color_hex: None,
            color_rgb: None,
            url_title: None,
            url_favicon: None,
        }
    } else if let Some((hex, rgb)) = ClipboardItem::detect_color(&content) {
        // 颜色类型
        ClipboardItem {
            id: uuid::Uuid::new_v4().to_string(),
            item_type: ClipboardItemType::Color,
            content: content.clone(),
            preview: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            source_app: None,
            is_pinned: false,
            is_favorite: false,
            is_quick_reply: false,
            category: None,
            image_width: None,
            image_height: None,
            image_path: None,
            thumbnail_path: None,
            file_name: None,
            file_size: None,
            file_path: None,
            color_hex: Some(hex),
            color_rgb: Some(rgb),
            url_title: None,
            url_favicon: None,
        }
    } else {
        // 普通文本
        ClipboardItem::new_text(content)
    }
}

/// 保存剪贴板项目到数据库
fn save_clipboard_item(app_handle: &AppHandle, item: &ClipboardItem) -> Result<(), String> {
    use crate::database;
    
    let conn = database::get_connection(app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    
    database::insert_item(&conn, item)
        .map_err(|e| format!("插入项目失败: {}", e))
}
