//
//  useClipboardMonitor.ts
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  剪贴板监控 Hook - 监听后端事件
//

import { useEffect } from 'react'
import { useClipboardStore } from '../stores/clipboardStore'
import { useSettingsStore } from '../stores/settingsStore'
import { onClipboardChange, isTauriEnv } from '../lib/tauri'
import type { ClipboardItem } from '../types'

/**
 * 剪贴板监控 Hook
 *
 * 监控机制说明：
 * - 后端 (clipboard.rs) 负责监控系统剪贴板变化并保存到数据库
 * - 后端检测到变化后发送 'clipboard-changed' 事件
 * - 前端只需监听事件并更新 UI 状态，不需要重复保存
 */
export function useClipboardMonitor() {
  const { addItem, items } = useClipboardStore()
  const { monitorEnabled } = useSettingsStore()

  useEffect(() => {
    // 如果监控未启用，不启动
    if (!monitorEnabled) {
      return
    }

    // 如果不在 Tauri 环境，不启动
    if (!isTauriEnv()) {
      console.log('非 Tauri 环境，剪贴板监控未启动')
      return
    }

    let unlisten: (() => void) | null = null

    // 监听后端剪贴板变化事件
    const setupBackendListener = async () => {
      try {
        unlisten = await onClipboardChange((item: ClipboardItem) => {
          // 检查是否已存在相同内容（避免重复）
          const exists = items.some(existingItem => existingItem.content === item.content)
          if (!exists) {
            // 只更新前端状态，后端已经保存到数据库了
            addItem(item)
            console.log('剪贴板变化:', item.type, item.content?.substring(0, 50))
          }
        })
        console.log('剪贴板监控已启动（后端事件模式）')
      } catch (error) {
        console.error('设置剪贴板监听失败:', error)
      }
    }

    setupBackendListener()

    // 清理
    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [monitorEnabled, addItem, items])
}
