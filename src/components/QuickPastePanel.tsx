import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClipboardStore } from '../stores/clipboardStore'
import { hideWindow } from '../lib/tauri'
import type { ClipboardItem } from '../types'

interface QuickPastePanelProps {
  onExit: () => void
}

/**
 * 快速粘贴面板（MVP）
 * - 显示最近 9 条
 * - 支持数字键 1-9 直贴
 * - Enter 粘贴当前选中项，Esc 关闭
 */
export default function QuickPastePanel({ onExit }: QuickPastePanelProps) {
  const { items, pasteItem } = useClipboardStore()
  const pageSize = 9
  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('oneclip.quickPaste.search') ?? ''
  })
  const [category, setCategory] = useState<'all' | 'text' | 'image' | 'file' | 'url' | 'favorite'>(() => {
    if (typeof window === 'undefined') return 'all'
    const saved = localStorage.getItem('oneclip.quickPaste.category')
    if (saved === 'text' || saved === 'image' || saved === 'file' || saved === 'url' || saved === 'favorite') {
      return saved
    }
    return 'all'
  })
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchFocused, setSearchFocused] = useState(false)

  const categoryTabs: Array<{ id: 'all' | 'text' | 'image' | 'file' | 'url' | 'favorite'; label: string }> = [
    { id: 'all', label: '全部' },
    { id: 'text', label: '文本' },
    { id: 'image', label: '图片' },
    { id: 'file', label: '文件' },
    { id: 'url', label: '链接' },
    { id: 'favorite', label: '收藏' },
  ]

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchCategory =
        category === 'all'
          ? true
          : category === 'favorite'
            ? item.isFavorite
            : item.type === category

      if (!matchCategory) return false
      if (!keyword) return true

      const haystack = [
        item.content,
        item.note ?? '',
        item.preview ?? '',
        item.sourceApp ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(keyword)
    })
  }, [items, search, category])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const quickItems = useMemo<ClipboardItem[]>(
    () => filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [filtered, currentPage],
  )

  const closePanel = useCallback(async () => {
    onExit()
    await hideWindow()
  }, [onExit])

  const doPaste = useCallback(async (index: number) => {
    const item = quickItems[index]
    if (!item) return
    await pasteItem(item.id)
    await closePanel()
  }, [quickItems, pasteItem, closePanel])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('oneclip.quickPaste.search', search)
  }, [search])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('oneclip.quickPaste.category', category)
  }, [category])

  useEffect(() => {
    setCurrentPage(0)
    setSelectedIndex(0)
  }, [category, search])

  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(totalPages - 1)
      setSelectedIndex(0)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (selectedIndex >= quickItems.length && quickItems.length > 0) {
      setSelectedIndex(0)
    }
  }, [quickItems.length, selectedIndex])

  useEffect(() => {
    if (quickItems.length === 0) {
      closePanel()
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const index = categoryTabs.findIndex((tab) => tab.id === category)
        const step = e.shiftKey ? -1 : 1
        const next = (index + step + categoryTabs.length) % categoryTabs.length
        setCategory(categoryTabs[next].id)
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentPage((prev) => Math.max(0, prev - 1))
        setSelectedIndex(0)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
        setSelectedIndex(0)
        return
      }

      if ((e.ctrlKey && e.key.toLowerCase() === 'f') || e.key === '/') {
        e.preventDefault()
        const el = document.getElementById('quick-paste-search') as HTMLInputElement | null
        el?.focus()
        el?.select()
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        closePanel()
        return
      }
      if (searchFocused) {
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(0, prev - 1))
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(quickItems.length - 1, prev + 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        doPaste(selectedIndex)
        return
      }
      if (e.key >= '1' && e.key <= '9') {
        const index = Number(e.key) - 1
        if (index < quickItems.length) {
          e.preventDefault()
          doPaste(index)
        }
      }
    }

    const handleBlur = () => {
      closePanel()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', handleBlur)
    }
  }, [quickItems.length, selectedIndex, doPaste, closePanel, category, categoryTabs, totalPages, searchFocused])

  return (
    <div className="h-screen bg-black/20 text-gray-100 p-2">
      <div className="rounded-xl border border-gray-700 bg-gray-950/95 p-2 shadow-2xl">
        <div className="text-xs text-gray-300 mb-2 px-1 flex items-center justify-between">
          <span>快速粘贴</span>
          <span className="text-gray-400">
            {currentPage + 1}/{totalPages}
          </span>
        </div>
        <div className="mb-2">
          <input
            id="quick-paste-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="搜索（/ 或 Ctrl+F）"
            className="w-full h-8 rounded-md border border-gray-700 bg-gray-900 px-2 text-sm outline-none focus:border-blue-400"
          />
        </div>
        <div className="mb-2 grid grid-cols-6 gap-1">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`h-7 rounded-md text-xs border ${
                category === tab.id
                  ? 'border-blue-400 bg-blue-600/25 text-blue-100'
                  : 'border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {quickItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => doPaste(index)}
              className={`w-full text-left rounded-lg px-3 py-2 border transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-600/30 border-blue-400'
                  : 'bg-gray-900/80 border-gray-700 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-gray-700 text-[11px] flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm truncate">
                  {item.content || '[空内容]'}
                </span>
              </div>
            </button>
          ))}
          {quickItems.length === 0 && (
            <div className="rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-6 text-center text-sm text-gray-400">
              当前筛选下没有内容
            </div>
          )}
        </div>
        <div className="mt-2 text-[11px] text-gray-400 px-1">
          1-9 直贴 · Enter 粘贴 · Tab 分类 · ←/→ 翻页 · Esc 关闭
        </div>
      </div>
    </div>
  )
}
