import { useEffect, useState, useRef } from 'react'
import { useClipboardStore } from './stores/clipboardStore'
import { useSettingsStore } from './stores/settingsStore'
import MainWindow from './components/MainWindow'
import TitleBar from './components/TitleBar'
import SettingsPanel from './components/SettingsPanel'
import QuickReplyManager from './components/QuickReplyManager'
import TextEditor from './components/TextEditor'
import { useKeyboard } from './hooks/useKeyboard'
import { useClipboardMonitor } from './hooks/useClipboardMonitor'
import type { ClipboardItem } from './types'

/**
 * OneClip Windows 版主应用
 * 使用 Tauri 2.0 + React + TypeScript
 */
function App() {
  const { isDarkMode } = useSettingsStore()
  const { loadItems, filteredItems, selectedIndex } = useClipboardStore()
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showQuickReply, setShowQuickReply] = useState(false)
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [editingItem, setEditingItem] = useState<ClipboardItem | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 初始化剪贴板监控
  useClipboardMonitor()

  // 打开编辑器
  const openEditor = (item: ClipboardItem) => {
    setEditingItem(item)
    setShowTextEditor(true)
  }

  // 键盘快捷键
  useKeyboard({
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
        await loadItems()
      } catch (error) {
        console.error('初始化失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [loadItems])

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
