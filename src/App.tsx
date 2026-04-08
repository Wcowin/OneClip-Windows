import { useEffect, useState, useRef } from 'react'
import { useClipboardStore } from './stores/clipboardStore'
import { useSettingsStore } from './stores/settingsStore'
import MainWindow from './components/MainWindow'
import TitleBar from './components/TitleBar'
import SettingsPanel from './components/SettingsPanel'
import QuickReplyManager from './components/QuickReplyManager'
import TextEditor from './components/TextEditor'
import QuickPastePanel from './components/QuickPastePanel'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useKeyboard } from './hooks/useKeyboard'
import { useClipboardMonitor } from './hooks/useClipboardMonitor'
import {
  cleanupExpired,
  setMonitorEnabled,
  setExcludedApps,
  setGlobalShortcuts,
  onQuickPasteOpen,
  positionQuickPasteWindowNearCursor,
} from './lib/tauri'
import type { ClipboardItem } from './types'

/**
 * OneClip Windows 版主应用
 * 使用 Tauri 2.0 + React + TypeScript
 */
function App() {
  const windowLabel = (typeof window !== 'undefined' && '__TAURI__' in window)
    ? getCurrentWindow().label
    : 'main'
  const isQuickPasteWindow = windowLabel === 'quick-paste'
  const { isDarkMode, autoClearDays, monitorEnabled, excludedApps, globalShortcut, quickPasteShortcut } = useSettingsStore()
  const { loadItems, filteredItems, selectedIndex } = useClipboardStore()
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showQuickReply, setShowQuickReply] = useState(false)
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [quickPasteSession, setQuickPasteSession] = useState(0)
  const [editingItem, setEditingItem] = useState<ClipboardItem | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 初始化剪贴板监控
  useClipboardMonitor(!isQuickPasteWindow)

  // 打开编辑器
  const openEditor = (item: ClipboardItem) => {
    setEditingItem(item)
    setShowTextEditor(true)
  }

  // 键盘快捷键
  useKeyboard({
    enabled: !isQuickPasteWindow,
    onEscape: () => {
      setShowSettings(false)
      setShowQuickReply(false)
      setShowTextEditor(false)
    },
    onSearch: () => {
      searchInputRef.current?.focus()
    },
    onEdit: () => {
      // E 键编辑当前选中项
      const currentItem = filteredItems[selectedIndex]
      if (currentItem && currentItem.type === 'text') {
        openEditor(currentItem)
      }
    },
  })

  useEffect(() => {
    // 初始化应用
    const init = async () => {
      try {
        if (isQuickPasteWindow) {
          await loadItems()
          return
        }
        // 自动清理过期记录（借鉴 EcoPaste 的 Duration 功能）
        if (autoClearDays > 0) {
          try {
            const deleted = await cleanupExpired(autoClearDays)
            if (deleted > 0) {
              console.log(`自动清理了 ${deleted} 条过期记录`)
            }
          } catch (e) {
            console.error('自动清理失败:', e)
          }
        }
        await loadItems()
      } catch (error) {
        console.error('初始化失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [isQuickPasteWindow, loadItems, autoClearDays])

  // 将前端持久化设置同步到后端监控线程（覆盖重启后的默认值）
  useEffect(() => {
    if (isQuickPasteWindow) {
      return
    }
    const syncMonitorSettings = async () => {
      try {
        await setMonitorEnabled(monitorEnabled)
        await setExcludedApps(excludedApps)
      } catch (error) {
        console.error('同步监控设置失败:', error)
      }
    }
    syncMonitorSettings()
  }, [isQuickPasteWindow, monitorEnabled, excludedApps])

  // 同步前端快捷键配置到后端（运行时重绑）
  useEffect(() => {
    if (isQuickPasteWindow) {
      return
    }
    const syncShortcuts = async () => {
      try {
        await setGlobalShortcuts(globalShortcut, quickPasteShortcut)
      } catch (error) {
        console.error('同步全局快捷键失败:', error)
      }
    }
    syncShortcuts()
  }, [isQuickPasteWindow, globalShortcut, quickPasteShortcut])

  useEffect(() => {
    if (!isQuickPasteWindow) {
      return
    }
    let unlisten: (() => void) | null = null
    const setup = async () => {
      unlisten = await onQuickPasteOpen(async () => {
        await positionQuickPasteWindowNearCursor()
        await loadItems()
        setQuickPasteSession((prev) => prev + 1)
      })
    }
    setup()
    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [isQuickPasteWindow, loadItems])

  // 应用深色模式
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  if (isQuickPasteWindow) {
    return <QuickPastePanel key={quickPasteSession} onExit={() => {}} />
  }

  return (
    <div className={`h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      {/* 标题栏 */}
      <TitleBar 
        onOpenSettings={() => setShowSettings(true)}
        onOpenQuickReply={() => setShowQuickReply(true)}
        searchInputRef={searchInputRef}
      />
      
      {/* 主内容区 */}
      <MainWindow onEdit={openEditor} />

      {/* 设置面板 */}
      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* 快捷回复管理 */}
      <QuickReplyManager 
        isOpen={showQuickReply} 
        onClose={() => setShowQuickReply(false)} 
      />

      {/* 文本编辑器 */}
      <TextEditor
        item={editingItem}
        isOpen={showTextEditor}
        onClose={() => {
          setShowTextEditor(false)
          setEditingItem(null)
        }}
      />
    </div>
  )
}

export default App
