//
//  useKeyboard.ts
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  键盘快捷键 Hook
//

import { useEffect, useCallback } from 'react'
import { useClipboardStore } from '../stores/clipboardStore'
import { hideWindow, pasteItem } from '../lib/tauri'

interface UseKeyboardOptions {
  onEscape?: () => void
  onSearch?: () => void
  onEdit?: () => void
}

/**
 * 键盘快捷键 Hook
 * 处理全局键盘事件
 */
export function useKeyboard(options: UseKeyboardOptions = {}) {
  const { 
    filteredItems, 
    selectedIndex, 
    setSelectedIndex,
    deleteItem,
  } = useClipboardStore()

  // 处理键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Escape - 关闭窗口
    if (e.key === 'Escape') {
      e.preventDefault()
      options.onEscape?.()
      hideWindow()
      return
    }

    // Ctrl+F - 聚焦搜索框
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault()
      options.onSearch?.()
      return
    }

    // 上下箭头 - 选择项目
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(0, selectedIndex - 1))
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(filteredItems.length - 1, selectedIndex + 1))
      return
    }

    // Enter - 粘贴选中项
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault()
      const item = filteredItems[selectedIndex]
      if (item) {
        pasteItem(item.content, item.type, item.imagePath)
      }
      return
    }

    // Delete - 删除选中项
    if (e.key === 'Delete') {
      e.preventDefault()
      const item = filteredItems[selectedIndex]
      if (item && !item.isPinned) {
        deleteItem(item.id)
      }
      return
    }

    // Home - 跳到第一项
    if (e.key === 'Home') {
      e.preventDefault()
      setSelectedIndex(0)
      return
    }

    // End - 跳到最后一项
    if (e.key === 'End') {
      e.preventDefault()
      setSelectedIndex(filteredItems.length - 1)
      return
    }

    // Page Up - 向上翻页
    if (e.key === 'PageUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(0, selectedIndex - 10))
      return
    }

    // Page Down - 向下翻页
    if (e.key === 'PageDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(filteredItems.length - 1, selectedIndex + 10))
      return
    }

    // 数字键 1-9 快速选择
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey) {
      const index = parseInt(e.key) - 1
      if (index < filteredItems.length) {
        e.preventDefault()
        const item = filteredItems[index]
        pasteItem(item.content, item.type, item.imagePath)
      }
      return
    }

    // E 键 - 编辑选中项
    if (e.key === 'e' && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      options.onEdit?.()
      return
    }
  }, [filteredItems, selectedIndex, setSelectedIndex, deleteItem, options])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
