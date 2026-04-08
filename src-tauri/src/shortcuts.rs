use std::str::FromStr;
use std::sync::{Mutex, OnceLock};

use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::database;

#[derive(Clone)]
struct ShortcutBindings {
    toggle: Shortcut,
    quick_paste: Shortcut,
}

static SHORTCUT_BINDINGS: OnceLock<Mutex<ShortcutBindings>> = OnceLock::new();

fn default_toggle_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyV)
}

fn default_quick_paste_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL), Code::Semicolon)
}

fn normalize_shortcut_input(input: &str) -> String {
    input
        .replace("Ctrl", "CONTROL")
        .replace("ctrl", "CONTROL")
        .replace("Cmd", "SUPER")
        .replace("cmd", "SUPER")
        .replace("Alt", "ALT")
        .replace("alt", "ALT")
        .replace("Shift", "SHIFT")
        .replace("shift", "SHIFT")
        .replace(' ', "")
}

fn parse_shortcut_with_fallback(input: &str, fallback: Shortcut) -> Shortcut {
    let normalized = normalize_shortcut_input(input);
    Shortcut::from_str(&normalized).unwrap_or(fallback)
}

fn parse_shortcut(input: &str) -> Result<Shortcut, String> {
    let normalized = normalize_shortcut_input(input);
    Shortcut::from_str(&normalized).map_err(|e| format!("快捷键格式无效 '{}': {}", input, e))
}

fn shortcut_to_setting_value(shortcut: &Shortcut) -> String {
    shortcut.to_string()
}

fn load_shortcuts_from_settings<R: Runtime>(app_handle: &AppHandle<R>) -> ShortcutBindings {
    let fallback_toggle = default_toggle_shortcut();
    let fallback_quick = default_quick_paste_shortcut();

    let mut toggle = fallback_toggle;
    let mut quick_paste = fallback_quick;

    if let Ok(conn) = database::get_connection(app_handle) {
        if let Ok(saved_toggle) = conn.query_row::<String, _, _>(
            "SELECT value FROM settings WHERE key = 'global_shortcut'",
            [],
            |row| row.get(0),
        ) {
            toggle = parse_shortcut_with_fallback(&saved_toggle, fallback_toggle);
        }

        if let Ok(saved_quick) = conn.query_row::<String, _, _>(
            "SELECT value FROM settings WHERE key = 'quick_paste_shortcut'",
            [],
            |row| row.get(0),
        ) {
            quick_paste = parse_shortcut_with_fallback(&saved_quick, fallback_quick);
        }
    }

    ShortcutBindings { toggle, quick_paste }
}

fn persist_shortcuts<R: Runtime>(app_handle: &AppHandle<R>, bindings: &ShortcutBindings) -> Result<(), String> {
    let conn = database::get_connection(app_handle)
        .map_err(|e| format!("数据库连接失败: {}", e))?;

    let toggle_value = shortcut_to_setting_value(&bindings.toggle);
    let quick_value = shortcut_to_setting_value(&bindings.quick_paste);

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('global_shortcut', ?1)",
        [&toggle_value],
    )
    .map_err(|e| format!("保存全局快捷键失败: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('quick_paste_shortcut', ?1)",
        [&quick_value],
    )
    .map_err(|e| format!("保存快速粘贴快捷键失败: {}", e))?;

    Ok(())
}

fn ensure_bindings_cell() {
    let _ = SHORTCUT_BINDINGS.get_or_init(|| {
        Mutex::new(ShortcutBindings {
            toggle: default_toggle_shortcut(),
            quick_paste: default_quick_paste_shortcut(),
        })
    });
}

pub fn setup_shortcuts<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), String> {
    ensure_bindings_cell();

    let loaded = load_shortcuts_from_settings(app_handle);
    if loaded.toggle == loaded.quick_paste {
        return Err("主窗口快捷键与快速粘贴快捷键不能相同".to_string());
    }

    let shortcuts = app_handle.global_shortcut();

    shortcuts
        .register(loaded.toggle)
        .map_err(|e| format!("注册主窗口快捷键失败: {}", e))?;
    shortcuts
        .register(loaded.quick_paste)
        .map_err(|e| format!("注册快速粘贴快捷键失败: {}", e))?;

    if let Some(lock) = SHORTCUT_BINDINGS.get() {
        if let Ok(mut bindings) = lock.lock() {
            *bindings = loaded.clone();
        }
    }

    let _ = persist_shortcuts(app_handle, &loaded);

    Ok(())
}

pub fn handle_shortcut<R: Runtime>(app_handle: &AppHandle<R>, shortcut: &Shortcut, state: ShortcutState) {
    if state != ShortcutState::Pressed {
        return;
    }

    let Some(lock) = SHORTCUT_BINDINGS.get() else {
        return;
    };

    let Ok(bindings) = lock.lock() else {
        return;
    };

    if shortcut == &bindings.quick_paste {
        if let Some(quick_window) = app_handle.get_webview_window("quick-paste") {
            if quick_window.is_visible().unwrap_or(false) {
                let _ = quick_window.hide();
            } else {
                let _ = quick_window.show();
                let _ = quick_window.set_focus();
                let _ = quick_window.emit("quick-paste-open", ());
            }
        }
        return;
    }

    if shortcut == &bindings.toggle {
        if let Some(window) = app_handle.get_webview_window("main") {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

pub fn update_shortcuts<R: Runtime>(
    app_handle: &AppHandle<R>,
    toggle_shortcut: String,
    quick_paste_shortcut: String,
) -> Result<(), String> {
    ensure_bindings_cell();
    let Some(lock) = SHORTCUT_BINDINGS.get() else {
        return Err("快捷键状态未初始化".to_string());
    };

    let new_toggle = parse_shortcut(&toggle_shortcut)?;
    let new_quick = parse_shortcut(&quick_paste_shortcut)?;

    if new_toggle == new_quick {
        return Err("主窗口快捷键与快速粘贴快捷键不能相同".to_string());
    }

    let old = {
        let bindings = lock.lock().map_err(|_| "快捷键状态锁失败".to_string())?;
        bindings.clone()
    };

    if old.toggle == new_toggle && old.quick_paste == new_quick {
        return Ok(());
    }

    let shortcuts = app_handle.global_shortcut();

    if old.toggle != new_toggle {
        let _ = shortcuts.unregister(old.toggle);
    }
    if old.quick_paste != new_quick {
        let _ = shortcuts.unregister(old.quick_paste);
    }

    if old.toggle != new_toggle {
        if let Err(e) = shortcuts.register(new_toggle) {
            let _ = shortcuts.register(old.toggle);
            if old.quick_paste != new_quick {
                let _ = shortcuts.register(old.quick_paste);
            }
            return Err(format!("注册主窗口快捷键失败: {}", e));
        }
    }

    if old.quick_paste != new_quick {
        if let Err(e) = shortcuts.register(new_quick) {
            if old.toggle != new_toggle {
                let _ = shortcuts.unregister(new_toggle);
                let _ = shortcuts.register(old.toggle);
            }
            let _ = shortcuts.register(old.quick_paste);
            return Err(format!("注册快速粘贴快捷键失败: {}", e));
        }
    }

    let updated = ShortcutBindings {
        toggle: new_toggle,
        quick_paste: new_quick,
    };

    {
        let mut bindings = lock.lock().map_err(|_| "快捷键状态锁失败".to_string())?;
        *bindings = updated.clone();
    }

    persist_shortcuts(app_handle, &updated)?;
    Ok(())
}
