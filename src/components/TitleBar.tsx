import { Search, Settings, Moon, Sun, X, Minus, Zap } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useClipboardStore } from '../stores/clipboardStore'
import { minimizeWindow, closeWindow } from '../lib/tauri'
import type { RefObject } from 'react'

interface TitleBarProps {
  onOpenSettings: () => void
  onOpenQuickReply: () => void
  searchInputRef?: RefObject<HTMLInputElement>
}

/**
 * 自定义标题栏组件
 * 包含搜索框、深色模式切换、设置按钮和窗口控制
 */
export default function TitleBar({ onOpenSettings, onOpenQuickReply, searchInputRef }: TitleBarProps) {
  const { isDarkMode, toggleDarkMode } = useSettingsStore()
  const { searchKeyword, setSearchKeyword } = useClipboardStore()

  // 窗口控制函数
  const handleMinimize = async () => {
    await minimizeWindow()
  }

  const handleClose = async () => {
    await closeWindow()
  }

  return (
    <div className="drag-region flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* 左侧：Logo 和搜索框 */}
      <div className="flex items-center gap-3 flex-1">
        {/* Logo */}
        <div className="no-drag flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">O</span>
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            OneClip
          </span>
        </div>

        {/* 搜索框 */}
        <div className="no-drag relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索剪贴板... (Ctrl+F)"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 
                       border border-transparent rounded-lg
                       focus:outline-none focus:border-primary-500 focus:bg-white dark:focus:bg-gray-600
                       text-gray-700 dark:text-gray-200 placeholder-gray-400"
          />
        </div>
      </div>

      {/* 右侧：工具按钮和窗口控制 */}
      <div className="no-drag flex items-center gap-1">
        {/* 快捷回复按钮 */}
        <button
          onClick={onOpenQuickReply}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                     text-gray-500 dark:text-gray-400 transition-colors"
          title="快捷回复管理"
        >
          <Zap className="w-4 h-4" />
        </button>

        {/* 深色模式切换 */}
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                     text-gray-500 dark:text-gray-400 transition-colors"
          title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* 设置按钮 */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                     text-gray-500 dark:text-gray-400 transition-colors"
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* 分隔线 */}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />

        {/* 最小化 */}
        <button
          onClick={handleMinimize}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                     text-gray-500 dark:text-gray-400 transition-colors"
          title="最小化"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* 关闭 */}
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 
                     text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 
                     transition-colors"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
