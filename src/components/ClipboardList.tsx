import { useRef, useEffect } from 'react'
import type { ClipboardItem, ViewMode } from '../types'
import ClipboardCard from './ClipboardCard'

/**
 * 剪贴板列表组件
 * 支持列表和网格两种视图模式
 * 注意：键盘导航由 useKeyboard Hook 统一处理，此处不重复监听
 */

interface ClipboardListProps {
  items: ClipboardItem[]
  selectedIndex: number
  onSelect: (index: number) => void
  viewMode: ViewMode
  onEdit?: (item: ClipboardItem) => void
  searchKeyword?: string  // 搜索关键词，用于高亮
}

export default function ClipboardList({
  items,
  selectedIndex,
  onSelect,
  viewMode,
  onEdit,
  searchKeyword,
}: ClipboardListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  // 自动滚动到选中项
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedIndex])

  // 空状态
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm">暂无剪贴板记录</p>
        <p className="text-xs mt-1">复制内容后会自动显示在这里</p>
      </div>
    )
  }

  // 列表视图
  if (viewMode === 'list') {
    return (
      <div ref={listRef} className="h-full overflow-y-auto p-2 space-y-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            ref={index === selectedIndex ? selectedRef : null}
          >
            <ClipboardCard
              item={item}
              isSelected={index === selectedIndex}
              onClick={() => onSelect(index)}
              viewMode="list"
              onEdit={onEdit}
              searchKeyword={searchKeyword}
            />
          </div>
        ))}
      </div>
    )
  }

  // 网格视图
  return (
    <div ref={listRef} className="h-full overflow-y-auto p-2">
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            ref={index === selectedIndex ? selectedRef : null}
          >
            <ClipboardCard
              item={item}
              isSelected={index === selectedIndex}
              onClick={() => onSelect(index)}
              viewMode="grid"
              onEdit={onEdit}
              searchKeyword={searchKeyword}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
