import { useClipboardStore } from '../stores/clipboardStore'
import { useSettingsStore } from '../stores/settingsStore'
import CategoryTabs from './CategoryTabs'
import ClipboardList from './ClipboardList'
import type { ClipboardItem } from '../types'

interface MainWindowProps {
  onEdit?: (item: ClipboardItem) => void
}

/**
 * 主窗口内容区
 * 包含分类标签和剪贴板列表
 */
export default function MainWindow({ onEdit }: MainWindowProps) {
  const { filteredItems, selectedIndex, setSelectedIndex, searchKeyword } = useClipboardStore()
  const { viewMode } = useSettingsStore()

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* 分类标签栏 */}
      <CategoryTabs />

      {/* 剪贴板列表 */}
      <div className="flex-1 overflow-hidden">
        <ClipboardList
          items={filteredItems}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          viewMode={viewMode}
          onEdit={onEdit}
          searchKeyword={searchKeyword}
        />
      </div>

      {/* 底部状态栏 */}
      <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{filteredItems.length} 条记录</span>
          <span className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
              ↑↓
            </kbd>
            <span>选择</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">
              Enter
            </kbd>
            <span>粘贴</span>
          </span>
        </div>
      </div>
    </div>
  )
}
