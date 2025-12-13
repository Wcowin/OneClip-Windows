//
//  paste.rs
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  粘贴模块 - 借鉴 EcoPaste 的实现
//  实现窗口切换监听和模拟粘贴功能
//

use std::sync::Mutex;

// 记录上一个活动窗口（非 OneClip 窗口）
static PREVIOUS_WINDOW: Mutex<Option<isize>> = Mutex::new(None);

// OneClip 主窗口标题
pub const MAIN_WINDOW_TITLE: &str = "OneClip";

/// 获取上一个窗口句柄
pub fn get_previous_window() -> Option<isize> {
    PREVIOUS_WINDOW.lock().unwrap().clone()
}

/// 设置上一个窗口句柄
pub fn set_previous_window(hwnd: isize) {
    let mut prev = PREVIOUS_WINDOW.lock().unwrap();
    *prev = Some(hwnd);
}

// ============ Windows 平台特定实现 ============
#[cfg(target_os = "windows")]
pub mod windows {
    use super::*;
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use std::ptr;
    use winapi::shared::minwindef::DWORD;
    use winapi::shared::windef::{HWINEVENTHOOK, HWND};
    use winapi::um::winuser::{
        GetWindowTextLengthW, GetWindowTextW, SetForegroundWindow, SetWinEventHook,
        EVENT_SYSTEM_FOREGROUND, WINEVENT_OUTOFCONTEXT,
    };

    /// 获取窗口标题
    unsafe fn get_window_title(hwnd: HWND) -> String {
        let length = GetWindowTextLengthW(hwnd);
        if length == 0 {
            return String::new();
        }

        let mut buffer: Vec<u16> = vec![0; (length + 1) as usize];
        GetWindowTextW(hwnd, buffer.as_mut_ptr(), length + 1);

        OsString::from_wide(&buffer[..length as usize])
            .to_string_lossy()
            .into_owned()
    }

    /// 窗口切换事件回调
    unsafe extern "system" fn event_hook_callback(
        _h_win_event_hook: HWINEVENTHOOK,
        event: DWORD,
        hwnd: HWND,
        _id_object: i32,
        _id_child: i32,
        _dw_event_thread: DWORD,
        _dwms_event_time: DWORD,
    ) {
        if event == EVENT_SYSTEM_FOREGROUND {
            let window_title = get_window_title(hwnd);

            // 如果是 OneClip 窗口，不记录
            if window_title.contains(MAIN_WINDOW_TITLE) {
                return;
            }

            // 记录上一个活动窗口
            set_previous_window(hwnd as isize);
            log::debug!("记录上一个窗口: {} ({})", window_title, hwnd as isize);
        }
    }

    /// 启动窗口切换监听
    pub fn start_window_observer() {
        unsafe {
            let hook = SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND,
                EVENT_SYSTEM_FOREGROUND,
                ptr::null_mut(),
                Some(event_hook_callback),
                0,
                0,
                WINEVENT_OUTOFCONTEXT,
            );

            if hook.is_null() {
                log::error!("设置窗口事件钩子失败");
            } else {
                log::info!("窗口事件钩子已设置");
            }
        }
    }

    /// 聚焦上一个窗口
    pub fn focus_previous_window() -> bool {
        unsafe {
            let hwnd = match get_previous_window() {
                Some(hwnd) => hwnd as HWND,
                None => {
                    log::warn!("没有记录的上一个窗口");
                    return false;
                }
            };

            if hwnd.is_null() {
                return false;
            }

            SetForegroundWindow(hwnd);
            log::debug!("已聚焦上一个窗口");
            true
        }
    }

    /// 模拟粘贴按键 (Shift+Insert 或 Ctrl+V)
    pub fn simulate_paste() {
        use enigo::{Direction::{Click, Press, Release}, Enigo, Key, Keyboard, Settings};

        // 等待窗口切换完成
        std::thread::sleep(std::time::Duration::from_millis(100));

        let mut enigo = match Enigo::new(&Settings::default()) {
            Ok(e) => e,
            Err(e) => {
                log::error!("创建 Enigo 失败: {}", e);
                return;
            }
        };

        // 使用 Shift+Insert 粘贴（更兼容）
        if let Err(e) = enigo.key(Key::Shift, Press) {
            log::error!("按下 Shift 失败: {}", e);
            return;
        }
        // Insert 键的虚拟键码是 0x2D
        if let Err(e) = enigo.key(Key::Other(0x2D), Click) {
            log::error!("按下 Insert 失败: {}", e);
        }
        if let Err(e) = enigo.key(Key::Shift, Release) {
            log::error!("释放 Shift 失败: {}", e);
        }

        log::debug!("模拟粘贴完成");
    }

    /// 执行粘贴操作
    pub fn paste() {
        // 1. 聚焦上一个窗口
        if !focus_previous_window() {
            return;
        }

        // 2. 模拟粘贴按键
        simulate_paste();
    }
}

// ============ macOS 平台占位实现 ============
#[cfg(target_os = "macos")]
pub mod macos {
    /// 启动窗口切换监听（macOS 暂不实现）
    pub fn start_window_observer() {
        log::info!("macOS 窗口监听暂未实现");
    }

    /// 执行粘贴操作（macOS 暂不实现）
    pub fn paste() {
        log::info!("macOS 粘贴暂未实现");
    }
}

// ============ Linux 平台占位实现 ============
#[cfg(target_os = "linux")]
pub mod linux {
    /// 启动窗口切换监听（Linux 暂不实现）
    pub fn start_window_observer() {
        log::info!("Linux 窗口监听暂未实现");
    }

    /// 执行粘贴操作（Linux 暂不实现）
    pub fn paste() {
        log::info!("Linux 粘贴暂未实现");
    }
}

// ============ 跨平台接口 ============

/// 启动窗口观察器
pub fn start_observer() {
    #[cfg(target_os = "windows")]
    windows::start_window_observer();
    
    #[cfg(target_os = "macos")]
    macos::start_window_observer();
    
    #[cfg(target_os = "linux")]
    linux::start_window_observer();
}

/// 执行粘贴
pub fn do_paste() {
    #[cfg(target_os = "windows")]
    windows::paste();
    
    #[cfg(target_os = "macos")]
    macos::paste();
    
    #[cfg(target_os = "linux")]
    linux::paste();
}
