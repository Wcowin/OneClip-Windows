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
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use image::ImageFormat;

// 全局监控开关
static MONITOR_ENABLED: AtomicBool = AtomicBool::new(true);
// 排除的应用列表
static EXCLUDED_APPS: Mutex<Vec<String>> = Mutex::new(Vec::new());

/// 设置监控开关
pub fn set_monitor_enabled(enabled: bool) {
    MONITOR_ENABLED.store(enabled, Ordering::SeqCst);
    log::info!("剪贴板监控: {}", if enabled { "已启用" } else { "已禁用" });
}

/// 获取监控状态
pub fn is_monitor_enabled() -> bool {
    MONITOR_ENABLED.load(Ordering::SeqCst)
}

/// 设置排除的应用列表
pub fn set_excluded_apps(apps: Vec<String>) {
    if let Ok(mut excluded) = EXCLUDED_APPS.lock() {
        *excluded = apps;
    }
}

/// 检查应用是否被排除
fn is_app_excluded(app_name: &str) -> bool {
    if let Ok(excluded) = EXCLUDED_APPS.lock() {
        for app in excluded.iter() {
            if app_name.to_lowercase().contains(&app.to_lowercase()) {
                return true;
            }
        }
    }
    false
}

/// 剪贴板项目类型
/// 使用小写序列化以匹配前端 TypeScript 类型
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
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
    pub note: Option<String>,  // 备注功能

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
            note: None,
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

/// 剪贴板内容哈希（用于检测变化）
#[derive(Clone, PartialEq)]
enum ClipboardHash {
    Text(String),
    Image(u64),
    None,
}

fn simple_hash(data: &[u8]) -> u64 {
    let mut hash: u64 = 0;
    for (i, &byte) in data.iter().enumerate() {
        if i % 100 == 0 {
            hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
        }
    }
    hash ^= data.len() as u64;
    hash
}

/// 获取前台窗口的进程名称 (Windows)
#[cfg(target_os = "windows")]
fn get_foreground_app_name() -> Option<String> {
    use winapi::um::winuser::GetForegroundWindow;
    use winapi::um::winuser::GetWindowThreadProcessId;
    use winapi::um::processthreadsapi::OpenProcess;
    use winapi::um::psapi::GetModuleBaseNameW;
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::winnt::PROCESS_QUERY_INFORMATION;
    use winapi::um::winnt::PROCESS_VM_READ;
    use std::ptr;
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return None;
        }

        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut process_id);
        if process_id == 0 {
            return None;
        }

        let process_handle = OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            0,
            process_id,
        );
        if process_handle.is_null() {
            return None;
        }

        let mut buffer: [u16; 260] = [0; 260];
        let len = GetModuleBaseNameW(
            process_handle,
            ptr::null_mut(),
            buffer.as_mut_ptr(),
            260,
        );

        CloseHandle(process_handle);

        if len == 0 {
            return None;
        }

        let name = OsString::from_wide(&buffer[..len as usize])
            .to_string_lossy()
            .into_owned();

        // 去掉 .exe 后缀
        Some(name.trim_end_matches(".exe").trim_end_matches(".EXE").to_string())
    }
}

#[cfg(not(target_os = "windows"))]
fn get_foreground_app_name() -> Option<String> {
    None
}

/// 启动剪贴板监控
#[cfg(target_os = "windows")]
pub fn start_clipboard_monitor(app_handle: AppHandle) {
    use winapi::um::winuser::*;
    use winapi::um::winbase::GlobalLock;
    use winapi::um::winbase::GlobalUnlock;
    use winapi::um::winbase::GlobalSize;
    use winapi::um::shellapi::{DragQueryFileW, HDROP};
    use std::ptr;

    let last_hash: Arc<Mutex<ClipboardHash>> = Arc::new(Mutex::new(ClipboardHash::None));
    log::info!("剪贴板监控已启动");

    loop {
        thread::sleep(Duration::from_millis(500));

        // 检查监控开关
        if !is_monitor_enabled() {
            continue;
        }

        // 获取来源应用
        let source_app = get_foreground_app_name();

        // 检查是否为排除的应用
        if let Some(ref app) = source_app {
            if is_app_excluded(app) {
                continue;
            }
        }

        unsafe {
            if OpenClipboard(ptr::null_mut()) == 0 {
                continue;
            }

            // 检查文件 (CF_HDROP) - 优先级最高
            let hdrop_handle = GetClipboardData(CF_HDROP);
            if !hdrop_handle.is_null() {
                let hdrop = hdrop_handle as HDROP;
                let file_count = DragQueryFileW(hdrop, 0xFFFFFFFF, ptr::null_mut(), 0);

                if file_count > 0 {
                    let mut file_paths: Vec<String> = Vec::new();

                    for i in 0..file_count {
                        // 获取文件路径长度
                        let len = DragQueryFileW(hdrop, i, ptr::null_mut(), 0);
                        if len > 0 {
                            let mut buffer: Vec<u16> = vec![0; (len + 1) as usize];
                            DragQueryFileW(hdrop, i, buffer.as_mut_ptr(), len + 1);

                            let path = String::from_utf16_lossy(&buffer[..len as usize]);
                            file_paths.push(path);
                        }
                    }

                    CloseClipboard();

                    if !file_paths.is_empty() {
                        // 使用文件路径列表作为哈希
                        let files_str = file_paths.join("|");
                        let mut last = last_hash.lock().unwrap();
                        if *last != ClipboardHash::Text(files_str.clone()) {
                            *last = ClipboardHash::Text(files_str);
                            drop(last);

                            // 为每个文件创建一个剪贴板项目
                            for file_path in file_paths {
                                let mut item = create_file_item(&file_path);
                                item.source_app = source_app.clone();
                                emit_and_save(&app_handle, item);
                            }
                        }
                    }
                    continue;
                }
            }

            // 检查图片 (CF_DIB)
            let dib_handle = GetClipboardData(CF_DIB);
            if !dib_handle.is_null() {
                let size = GlobalSize(dib_handle) as usize;
                let ptr = GlobalLock(dib_handle);
                if !ptr.is_null() && size > 40 {
                    let dib_data = std::slice::from_raw_parts(ptr as *const u8, size).to_vec();
                    GlobalUnlock(dib_handle);
                    CloseClipboard();

                    let hash = simple_hash(&dib_data);
                    let mut last = last_hash.lock().unwrap();
                    if *last != ClipboardHash::Image(hash) {
                        *last = ClipboardHash::Image(hash);
                        drop(last);
                        if let Some(mut item) = save_dib_image(&app_handle, &dib_data) {
                            item.source_app = source_app.clone();
                            emit_and_save(&app_handle, item);
                        }
                    }
                    continue;
                }
            }

            // 检查文本 (CF_UNICODETEXT)
            let text_handle = GetClipboardData(CF_UNICODETEXT);
            if !text_handle.is_null() {
                let ptr = GlobalLock(text_handle) as *const u16;
                if !ptr.is_null() {
                    let mut len = 0;
                    while *ptr.add(len) != 0 { len += 1; }
                    let text = String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len));
                    GlobalUnlock(text_handle);
                    CloseClipboard();

                    if !text.is_empty() {
                        let mut last = last_hash.lock().unwrap();
                        if *last != ClipboardHash::Text(text.clone()) {
                            *last = ClipboardHash::Text(text.clone());
                            drop(last);
                            let mut item = create_clipboard_item(text);
                            item.source_app = source_app.clone();
                            emit_and_save(&app_handle, item);
                        }
                    }
                    continue;
                }
            }

            CloseClipboard();
        }
    }
}

/// 创建文件类型的剪贴板项目
fn create_file_item(file_path: &str) -> ClipboardItem {
    use std::path::Path;

    let path = Path::new(file_path);
    let file_name = path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.to_string());

    // 获取文件大小
    let file_size = std::fs::metadata(file_path)
        .map(|m| m.len())
        .ok();

    ClipboardItem {
        id: uuid::Uuid::new_v4().to_string(),
        item_type: ClipboardItemType::File,
        content: file_path.to_string(),
        preview: Some(file_name.clone()),
        timestamp: chrono::Utc::now().timestamp_millis(),
        source_app: None,
        is_pinned: false,
        is_favorite: false,
        is_quick_reply: false,
        category: None,
        note: None,
        image_width: None,
        image_height: None,
        image_path: None,
        thumbnail_path: None,
        file_name: Some(file_name),
        file_size,
        file_path: Some(file_path.to_string()),
        color_hex: None,
        color_rgb: None,
        url_title: None,
        url_favicon: None,
    }
}

#[cfg(not(target_os = "windows"))]
pub fn start_clipboard_monitor(_app_handle: AppHandle) {
    log::warn!("剪贴板监控仅支持 Windows");
}

/// 缩略图最大尺寸
const THUMBNAIL_MAX_SIZE: u32 = 200;

/// 生成缩略图
fn generate_thumbnail(img: &image::RgbaImage, thumb_path: &std::path::Path) -> Option<()> {
    use image::imageops::FilterType;

    let (width, height) = img.dimensions();

    // 计算缩略图尺寸，保持宽高比
    let (thumb_width, thumb_height) = if width > height {
        let ratio = THUMBNAIL_MAX_SIZE as f32 / width as f32;
        (THUMBNAIL_MAX_SIZE, (height as f32 * ratio) as u32)
    } else {
        let ratio = THUMBNAIL_MAX_SIZE as f32 / height as f32;
        ((width as f32 * ratio) as u32, THUMBNAIL_MAX_SIZE)
    };

    // 如果原图已经很小，不需要生成缩略图
    if width <= THUMBNAIL_MAX_SIZE && height <= THUMBNAIL_MAX_SIZE {
        return None;
    }

    // 生成缩略图
    let thumbnail = image::imageops::resize(img, thumb_width, thumb_height, FilterType::Triangle);

    // 保存为 JPEG 格式（更小的文件大小）
    thumbnail.save_with_format(thumb_path, ImageFormat::Jpeg).ok()?;
    log::debug!("缩略图已生成: {:?}", thumb_path);

    Some(())
}

/// 保存 DIB 图片数据
#[cfg(target_os = "windows")]
fn save_dib_image(app_handle: &AppHandle, dib_data: &[u8]) -> Option<ClipboardItem> {
    use crate::database;

    if dib_data.len() < 40 {
        return None;
    }

    // 解析 BITMAPINFOHEADER
    let width = i32::from_le_bytes([dib_data[4], dib_data[5], dib_data[6], dib_data[7]]) as u32;
    let height = i32::from_le_bytes([dib_data[8], dib_data[9], dib_data[10], dib_data[11]]).unsigned_abs();
    let bit_count = u16::from_le_bytes([dib_data[14], dib_data[15]]);

    if bit_count != 32 && bit_count != 24 {
        log::warn!("不支持的位深度: {}", bit_count);
        return None;
    }

    // 获取存储目录
    let image_dir = database::get_image_directory().or_else(|| {
        let local = database::get_local_data_dir(app_handle);
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let dir = local.join(&today);
        std::fs::create_dir_all(&dir).ok()?;
        Some(dir)
    })?;

    let id = uuid::Uuid::new_v4().to_string();
    let filename = format!("{}.png", id);
    let thumb_filename = format!("{}_thumb.jpg", id);
    let filepath = image_dir.join(&filename);
    let thumb_filepath = image_dir.join(&thumb_filename);

    // 转换 DIB 到 RGBA
    let header_size = u32::from_le_bytes([dib_data[0], dib_data[1], dib_data[2], dib_data[3]]) as usize;
    let pixel_data = &dib_data[header_size..];
    let bytes_per_pixel = (bit_count / 8) as usize;
    let row_size = ((width as usize * bytes_per_pixel + 3) / 4) * 4;

    let mut rgba = vec![0u8; (width * height * 4) as usize];
    for y in 0..height as usize {
        let src_y = height as usize - 1 - y; // DIB 是倒置的
        for x in 0..width as usize {
            let src_idx = src_y * row_size + x * bytes_per_pixel;
            let dst_idx = (y * width as usize + x) * 4;

            if src_idx + bytes_per_pixel <= pixel_data.len() {
                rgba[dst_idx] = pixel_data[src_idx + 2];     // R
                rgba[dst_idx + 1] = pixel_data[src_idx + 1]; // G
                rgba[dst_idx + 2] = pixel_data[src_idx];     // B
                rgba[dst_idx + 3] = if bit_count == 32 { pixel_data[src_idx + 3] } else { 255 };
            }
        }
    }

    let img = image::RgbaImage::from_raw(width, height, rgba)?;

    // 保存原图
    img.save_with_format(&filepath, ImageFormat::Png).ok()?;
    log::info!("图片已保存: {:?}", filepath);

    // 生成缩略图
    let thumbnail_path = if generate_thumbnail(&img, &thumb_filepath).is_some() {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        Some(format!("{}/{}", today, thumb_filename))
    } else {
        None
    };

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let relative_path = format!("{}/{}", today, filename);

    Some(ClipboardItem {
        id,
        item_type: ClipboardItemType::Image,
        content: String::new(),
        preview: None,
        timestamp: chrono::Utc::now().timestamp_millis(),
        source_app: None,
        is_pinned: false,
        is_favorite: false,
        is_quick_reply: false,
        category: None,
        note: None,
        image_width: Some(width),
        image_height: Some(height),
        image_path: Some(relative_path.clone()),
        thumbnail_path,
        file_name: Some(filename),
        file_size: None,
        file_path: Some(relative_path),
        color_hex: None,
        color_rgb: None,
        url_title: None,
        url_favicon: None,
    })
}

/// 发送事件并保存到数据库
fn emit_and_save(app_handle: &AppHandle, item: ClipboardItem) {
    if let Err(e) = app_handle.emit("clipboard-changed", &item) {
        log::error!("发送剪贴板变化事件失败: {}", e);
    } else {
        log::debug!("剪贴板变化: {:?}", item.item_type);
    }

    if let Err(e) = save_clipboard_item(app_handle, &item) {
        log::error!("保存剪贴板项目失败: {}", e);
    }

    // 记录到 changes.jsonl
    let _ = crate::sync::record_change(
        &item.id,
        crate::sync::ChangeOperation::Insert,
        Some(&item),
        None,
        None,
    );
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
            note: None,
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
            note: None,
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
