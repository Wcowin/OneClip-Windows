//
//  tauri.ts
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  Tauri API 封装层 - 统一管理与 Rust 后端的通信
//

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow, PhysicalPosition, cursorPosition, currentMonitor } from '@tauri-apps/api/window'
import type { ClipboardItem } from '../types'

// ============ 剪贴板操作 ============

/**
 * 获取剪贴板历史记录
 */
export async function getClipboardHistory(limit?: number): Promise<ClipboardItem[]> {
  try {
    const items = await invoke<ClipboardItem[]>('get_clipboard_history', { limit })
    return items
  } catch (error) {
    console.error('获取剪贴板历史失败:', error)
    return []
  }
}

/**
 * 添加剪贴板项目
 */
export async function addClipboardItem(item: ClipboardItem): Promise<void> {
  try {
    await invoke('add_clipboard_item', { item })
  } catch (error) {
    console.error('添加剪贴板项目失败:', error)
  }
}

/**
 * 删除剪贴板项目
 */
export async function deleteClipboardItem(id: string): Promise<void> {
  try {
    await invoke('delete_clipboard_item', { id })
  } catch (error) {
    console.error('删除剪贴板项目失败:', error)
  }
}

/**
 * 切换置顶状态
 */
export async function togglePin(id: string, isPinned: boolean): Promise<void> {
  try {
    await invoke('toggle_pin', { id, isPinned })
  } catch (error) {
    console.error('切换置顶状态失败:', error)
  }
}

/**
 * 切换收藏状态
 */
export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  try {
    await invoke('toggle_favorite', { id, isFavorite })
  } catch (error) {
    console.error('切换收藏状态失败:', error)
  }
}

/**
 * 清空历史记录
 */
export async function clearHistory(): Promise<void> {
  try {
    await invoke('clear_history')
  } catch (error) {
    console.error('清空历史失败:', error)
  }
}

/**
 * 粘贴项目
 * 支持文本和图片类型
 */
export async function pasteItem(content: string, itemType: string, imagePath?: string): Promise<void> {
  try {
    // 文本类型：先写入文本到剪贴板
    if (itemType !== 'image') {
      await copyToClipboard(content)
    }
    // 调用后端执行粘贴
    // 后端会：1. 如果是图片则写入图片到剪贴板 2. 隐藏窗口 3. 聚焦上一个窗口 4. 模拟按键
    await invoke('paste_item', {
      content,
      item_type: itemType,
      image_path: imagePath || null
    })
  } catch (error) {
    console.error('粘贴失败:', error)
  }
}

// ============ 设置操作 ============

/**
 * 获取所有设置
 */
export async function getSettings(): Promise<Record<string, string>> {
  try {
    const settings = await invoke<Record<string, string>>('get_settings')
    return settings
  } catch (error) {
    console.error('获取设置失败:', error)
    return {}
  }
}

/**
 * 保存设置
 */
export async function saveSetting(key: string, value: string): Promise<void> {
  try {
    await invoke('save_settings', { key, value })
  } catch (error) {
    console.error('保存设置失败:', error)
  }
}

/**
 * 设置后端全局快捷键（主窗口 + 快速粘贴）
 */
export async function setGlobalShortcuts(globalShortcut: string, quickPasteShortcut: string): Promise<void> {
  await invoke('set_global_shortcuts', {
    global_shortcut: globalShortcut,
    quick_paste_shortcut: quickPasteShortcut,
  })
}

export interface UpdateCheckResult {
  available: boolean
  version?: string
  currentVersion?: string
  notes?: string
}

/**
 * 检查更新
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  return await invoke<UpdateCheckResult>('check_for_updates')
}

/**
 * 下载并安装更新
 */
export async function downloadAndInstallUpdate(): Promise<void> {
  await invoke('download_and_install_update')
}

// ============ 窗口操作 ============

/**
 * 显示窗口
 */
export async function showWindow(): Promise<void> {
  try {
    const window = getCurrentWindow()
    await window.show()
    await window.setFocus()
  } catch (error) {
    console.error('显示窗口失败:', error)
  }
}

/**
 * 隐藏窗口
 */
export async function hideWindow(): Promise<void> {
  try {
    const window = getCurrentWindow()
    await window.hide()
  } catch (error) {
    console.error('隐藏窗口失败:', error)
  }
}

/**
 * 将快速粘贴窗口定位到鼠标附近（与 Mac 行为对齐）
 */
export async function positionQuickPasteWindowNearCursor(): Promise<void> {
  const window = getCurrentWindow()
  const size = await window.outerSize()
  const cursor = await cursorPosition()
  const monitor = await currentMonitor()

  let x = cursor.x + 10
  let y = cursor.y + 10

  if (monitor) {
    const margin = 8
    const maxX = monitor.position.x + monitor.size.width - size.width - margin
    const maxY = monitor.position.y + monitor.size.height - size.height - margin
    const minX = monitor.position.x + margin
    const minY = monitor.position.y + margin
    x = Math.max(minX, Math.min(x, maxX))
    y = Math.max(minY, Math.min(y, maxY))
  }

  await window.setPosition(new PhysicalPosition(Math.round(x), Math.round(y)))
}

/**
 * 最小化窗口
 */
export async function minimizeWindow(): Promise<void> {
  try {
    const window = getCurrentWindow()
    await window.minimize()
  } catch (error) {
    console.error('最小化窗口失败:', error)
  }
}

/**
 * 关闭窗口（实际是隐藏）
 */
export async function closeWindow(): Promise<void> {
  await hideWindow()
}

// ============ 事件监听 ============

/**
 * 监听剪贴板变化事件
 */
export async function onClipboardChange(
  callback: (item: ClipboardItem) => void
): Promise<() => void> {
  const unlisten = await listen<ClipboardItem>('clipboard-changed', (event) => {
    callback(event.payload)
  })
  return unlisten
}

/**
 * 监听显示窗口事件（由全局快捷键触发）
 */
export async function onShowWindow(callback: () => void): Promise<() => void> {
  const unlisten = await listen('show-window', () => {
    callback()
  })
  return unlisten
}

/**
 * 监听快速粘贴打开事件（由全局快捷键触发）
 */
export async function onQuickPasteOpen(callback: () => void): Promise<() => void> {
  const unlisten = await listen('quick-paste-open', () => {
    callback()
  })
  return unlisten
}

// ============ 工具函数 ============

/**
 * 检查是否在 Tauri 环境中运行
 */
export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

/**
 * 复制文本到剪贴板（使用浏览器 API 作为后备）
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (isTauriEnv()) {
    try {
      // 使用 Tauri 剪贴板插件
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
      await writeText(text)
      return
    } catch (error) {
      console.warn('Tauri 剪贴板写入失败，使用浏览器 API:', error)
    }
  }
  
  // 后备方案：使用浏览器 API
  await navigator.clipboard.writeText(text)
}

/**
 * 从剪贴板读取文本
 */
export async function readFromClipboard(): Promise<string> {
  if (isTauriEnv()) {
    try {
      const { readText } = await import('@tauri-apps/plugin-clipboard-manager')
      return await readText()
    } catch (error) {
      console.warn('Tauri 剪贴板读取失败，使用浏览器 API:', error)
    }
  }
  
  return await navigator.clipboard.readText()
}

// 别名导出，用于剪贴板监控
export const readClipboardText = readFromClipboard

// ============ 同步目录操作 ============

/**
 * 设置同步目录（Mac 版 OneClip 数据目录）
 */
export async function setSyncDirectory(path: string): Promise<void> {
  await invoke('set_sync_directory', { path })
}

/**
 * 获取同步目录
 */
export async function getSyncDirectory(): Promise<string | null> {
  return await invoke<string | null>('get_sync_directory')
}

/**
 * 执行同步（应用远程变更）
 */
export async function syncNow(): Promise<number> {
  return await invoke<number>('sync_now')
}

/**
 * 获取设备信息
 */
export async function getDeviceInfo(): Promise<{ deviceId: string; deviceName: string }> {
  return await invoke('get_device_info')
}

// ============ 自动启动 ============

/**
 * 设置开机自启动
 */
export async function setAutostart(enabled: boolean): Promise<void> {
  await invoke('set_autostart', { enabled })
}

/**
 * 获取开机自启动状态
 */
export async function getAutostart(): Promise<boolean> {
  return await invoke<boolean>('get_autostart')
}

/**
 * 更新备注
 */
export async function updateNote(id: string, note: string | null): Promise<void> {
  await invoke('update_note', { id, note })
}

/**
 * 更新内容
 */
export async function updateContent(id: string, content: string): Promise<void> {
  await invoke('update_content', { id, content })
}

/**
 * 清理过期记录
 * @param days 保留天数，超过此天数的记录将被删除（置顶和收藏除外）
 * @returns 删除的记录数
 */
export async function cleanupExpired(days: number): Promise<number> {
  return await invoke<number>('cleanup_expired', { days })
}

// ============ 监控设置 ============

/**
 * 设置剪贴板监控开关
 */
export async function setMonitorEnabled(enabled: boolean): Promise<void> {
  await invoke('set_monitor_enabled', { enabled })
}

/**
 * 获取剪贴板监控状态
 */
export async function getMonitorEnabled(): Promise<boolean> {
  return await invoke<boolean>('get_monitor_enabled')
}

/**
 * 设置排除的应用列表
 */
export async function setExcludedApps(apps: string[]): Promise<void> {
  await invoke('set_excluded_apps', { apps })
}

/**
 * 限制历史记录数量
 * @param maxCount 最大记录数（置顶和收藏除外）
 * @returns 删除的记录数
 */
export async function limitHistoryCount(maxCount: number): Promise<number> {
  return await invoke<number>('limit_history_count', { maxCount })
}

// ============ 图片路径 ============

/**
 * 获取图片的完整路径（用于显示）
 * 相对路径会拼接同步目录或本地目录
 */
export async function getImageFullPath(relativePath: string): Promise<string> {
  if (!relativePath) return ''
  // 如果已经是绝对路径，直接返回
  if (relativePath.startsWith('/') || relativePath.includes(':')) {
    return relativePath
  }
  // 获取同步目录
  const syncDir = await getSyncDirectory()
  if (syncDir) {
    return `${syncDir}/${relativePath}`
  }
  // 使用本地目录
  const { appDataDir } = await import('@tauri-apps/api/path')
  const localDir = await appDataDir()
  return `${localDir}${relativePath}`
}
