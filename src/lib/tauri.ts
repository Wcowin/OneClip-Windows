//
//  tauri.ts
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  Tauri API 封装层 - 统一管理与 Rust 后端的通信
//

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
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
 */
export async function pasteItem(content: string, itemType: string): Promise<void> {
  try {
    // 先写入剪贴板
    await copyToClipboard(content)
    // 调用后端执行粘贴（后端会隐藏窗口、聚焦上一个窗口、模拟按键）
    await invoke('paste_item', { content, item_type: itemType })
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
