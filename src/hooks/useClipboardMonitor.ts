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
export function useClipboardMonitor(enabled = true) {
  const { addItem } = useClipboardStore()
  const { monitorEnabled } = useSettingsStore()

  useEffect(() => {
    if (!enabled) {
      return
    }

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
          // 后端已完成入库，前端仅增量更新 UI
          addItem(item)
          console.log('剪贴板变化:', item.type, item.content?.substring(0, 50))
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
  }, [enabled, monitorEnabled, addItem])
}
