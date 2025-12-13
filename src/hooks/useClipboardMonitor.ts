//
//  useClipboardMonitor.ts
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  剪贴板监控 Hook - 使用前端轮询方案
//

import { useEffect, useRef, useCallback } from 'react'
import { useClipboardStore } from '../stores/clipboardStore'
import { useSettingsStore } from '../stores/settingsStore'
import { 
  onClipboardChange, 
  isTauriEnv, 
  readClipboardText,
  addClipboardItem 
} from '../lib/tauri'
import type { ClipboardItem } from '../types'

/**
 * 剪贴板监控 Hook
 * 使用前端轮询方案监听剪贴板变化
 * 支持两种模式：
 * 1. Tauri 事件监听（后端推送）
 * 2. 前端轮询（使用 clipboard-manager 插件）
 */
export function useClipboardMonitor() {
  const { addItem, items } = useClipboardStore()
  const { monitorEnabled } = useSettingsStore()
  const lastContentRef = useRef<string>('')
  const intervalRef = useRef<number | null>(null)

  // 检测内容类型
  const detectContentType = useCallback((content: string): ClipboardItem['type'] => {
    // URL 检测
    if (content.startsWith('http://') || content.startsWith('https://') || content.startsWith('ftp://')) {
      return 'url'
    }
    // 颜色检测 (#RRGGBB)
    if (/^#[0-9A-Fa-f]{6}$/.test(content.trim())) {
      return 'color'
    }
    // 默认文本
    return 'text'
  }, [])

  // 创建剪贴板项目
  const createClipboardItem = useCallback((content: string): ClipboardItem => {
    const type = detectContentType(content)
    const now = Date.now()
    
    const item: ClipboardItem = {
      id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: now,
      isPinned: false,
      isFavorite: false,
      isQuickReply: false,
    }

    // 颜色类型额外处理
    if (type === 'color') {
      const hex = content.trim().toUpperCase()
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      item.colorHex = hex
      item.colorRGB = `rgb(${r}, ${g}, ${b})`
    }

    return item
  }, [detectContentType])

  // 检查剪贴板变化
  const checkClipboard = useCallback(async () => {
    try {
      const content = await readClipboardText()
      
      if (content && content !== lastContentRef.current) {
        // 检查是否已存在相同内容（避免重复）
        const exists = items.some(item => item.content === content)
        
        if (!exists) {
          lastContentRef.current = content
          
          // 创建新项目
          const newItem = createClipboardItem(content)
          
          // 添加到前端状态
          addItem(newItem)
          
          // 保存到后端数据库
          try {
            await addClipboardItem(newItem)
          } catch (error) {
            console.error('保存到数据库失败:', error)
          }
          
          console.log('剪贴板变化:', newItem.type, content.substring(0, 50))
        } else {
          // 更新最后内容引用，避免重复检测
          lastContentRef.current = content
        }
      }
    } catch (error) {
      // 静默处理错误，避免频繁日志
    }
  }, [items, addItem, createClipboardItem])

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

    // 方案1：尝试使用后端事件监听
    const setupBackendListener = async () => {
      try {
        unlisten = await onClipboardChange((item: ClipboardItem) => {
          addItem(item)
        })
        console.log('使用后端事件监听模式')
      } catch (error) {
        console.log('后端事件监听不可用，切换到前端轮询模式')
        // 方案2：使用前端轮询
        startPolling()
      }
    }

    // 启动前端轮询
    const startPolling = () => {
      // 立即检查一次
      checkClipboard()
      
      // 每 500ms 检查一次
      intervalRef.current = window.setInterval(checkClipboard, 500)
      console.log('剪贴板监控已启动（轮询模式）')
    }

    // 优先尝试后端监听，失败则使用轮询
    setupBackendListener()

    // 清理
    return () => {
      if (unlisten) {
        unlisten()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [monitorEnabled, addItem, checkClipboard])
}
