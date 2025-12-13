import { create } from 'zustand'
import type { ClipboardItem, CategoryType } from '../types'
import { getClipboardHistory, pasteItem as tauriPasteItem, deleteClipboardItem, togglePin as tauriTogglePin, toggleFavorite as tauriToggleFavorite, clearHistory as tauriClearHistory } from '../lib/tauri'

/**
 * 剪贴板状态管理
 * 使用 Zustand 进行状态管理，轻量且高效
 */

interface ClipboardState {
  // 数据
  items: ClipboardItem[]
  filteredItems: ClipboardItem[]
  selectedIndex: number
  
  // 过滤器
  currentCategory: CategoryType
  searchKeyword: string
  
  // 操作
  loadItems: () => Promise<void>
  addItem: (item: ClipboardItem) => void
  updateItem: (id: string, updates: Partial<ClipboardItem>) => void
  deleteItem: (id: string) => void
  togglePin: (id: string) => void
  toggleFavorite: (id: string) => void
  setCategory: (category: CategoryType) => void
  setSearchKeyword: (keyword: string) => void
  setSelectedIndex: (index: number) => void
  pasteItem: (id: string) => Promise<void>
  clearHistory: () => void
  moveItem: (fromIndex: number, toIndex: number) => void
}

// 模拟数据（后续会从 Tauri 后端获取）
const mockItems: ClipboardItem[] = [
  {
    id: '1',
    type: 'text',
    content: '欢迎使用 OneClip Windows 版！这是一个智能剪贴板管理工具。',
    timestamp: Date.now() - 1000 * 60 * 5,
    sourceApp: 'Chrome',
    isPinned: true,
    isFavorite: false,
    isQuickReply: false,
  },
  {
    id: '2',
    type: 'url',
    content: 'https://github.com',
    urlTitle: 'GitHub: Let\'s build from here',
    timestamp: Date.now() - 1000 * 60 * 10,
    sourceApp: 'Edge',
    isPinned: false,
    isFavorite: true,
    isQuickReply: false,
  },
  {
    id: '3',
    type: 'text',
    content: 'npm install @tauri-apps/cli',
    timestamp: Date.now() - 1000 * 60 * 30,
    sourceApp: 'VS Code',
    isPinned: false,
    isFavorite: false,
    isQuickReply: true,
    category: '代码',
  },
  {
    id: '4',
    type: 'color',
    content: '#0ea5e9',
    colorHex: '#0ea5e9',
    colorRGB: 'rgb(14, 165, 233)',
    timestamp: Date.now() - 1000 * 60 * 60,
    sourceApp: 'Figma',
    isPinned: false,
    isFavorite: false,
    isQuickReply: false,
  },
  {
    id: '5',
    type: 'text',
    content: `这是一段较长的文本内容，用于测试多行显示效果。
OneClip 是一款专为效率而生的剪贴板管理工具。
它可以帮助你管理剪贴板历史、快速搜索、智能分类。
支持文本、图片、文件、链接等多种类型。`,
    timestamp: Date.now() - 1000 * 60 * 120,
    sourceApp: 'Notepad',
    isPinned: false,
    isFavorite: false,
    isQuickReply: false,
  },
]

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  // 初始状态
  items: [],
  filteredItems: [],
  selectedIndex: 0,
  currentCategory: 'all',
  searchKeyword: '',

  // 加载剪贴板历史
  loadItems: async () => {
    try {
      // 从 Tauri 后端加载数据
      const items = await getClipboardHistory(1000)
      if (items && items.length > 0) {
        set({ 
          items,
          filteredItems: items,
        })
      } else {
        // 后端无数据时使用模拟数据（开发用）
        set({ 
          items: mockItems,
          filteredItems: mockItems,
        })
      }
    } catch (error) {
      console.error('加载剪贴板历史失败:', error)
      // 加载失败时使用模拟数据
      set({ 
        items: mockItems,
        filteredItems: mockItems,
      })
    }
  },

  // 添加新项目
  addItem: (item) => {
    set((state) => {
      const newItems = [item, ...state.items]
      return {
        items: newItems,
        filteredItems: filterItems(newItems, state.currentCategory, state.searchKeyword),
      }
    })
  },

  // 更新项目（编辑功能）
  updateItem: (id, updates) => {
    set((state) => {
      const newItems = state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
      return {
        items: newItems,
        filteredItems: filterItems(newItems, state.currentCategory, state.searchKeyword),
      }
    })
  },

  // 删除项目
  deleteItem: (id: string) => {
    // 调用后端删除
    deleteClipboardItem(id).catch(err => console.error('删除失败:', err))
    
    set((state) => {
      const newItems = state.items.filter((item) => item.id !== id)
      return {
        items: newItems,
        filteredItems: filterItems(newItems, state.currentCategory, state.searchKeyword),
        selectedIndex: Math.min(state.selectedIndex, newItems.length - 1),
      }
    })
  },

  // 切换置顶
  togglePin: (id: string) => {
    const item = get().items.find((i: ClipboardItem) => i.id === id)
    if (item) {
      // 调用后端更新
      tauriTogglePin(id, !item.isPinned).catch(err => console.error('置顶失败:', err))
    }
    
    set((state) => {
      const newItems = state.items.map((item: ClipboardItem) =>
        item.id === id ? { ...item, isPinned: !item.isPinned } : item
      )
      // 置顶项排在前面
      newItems.sort((a: ClipboardItem, b: ClipboardItem) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return b.timestamp - a.timestamp
      })
      return {
        items: newItems,
        filteredItems: filterItems(newItems, state.currentCategory, state.searchKeyword),
      }
    })
  },

  // 切换收藏
  toggleFavorite: (id: string) => {
    const item = get().items.find((i: ClipboardItem) => i.id === id)
    if (item) {
      // 调用后端更新
      tauriToggleFavorite(id, !item.isFavorite).catch(err => console.error('收藏失败:', err))
    }
    
    set((state) => {
      const newItems = state.items.map((item: ClipboardItem) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
      return {
        items: newItems,
        filteredItems: filterItems(newItems, state.currentCategory, state.searchKeyword),
      }
    })
  },

  // 设置分类
  setCategory: (category) => {
    set((state) => ({
      currentCategory: category,
      filteredItems: filterItems(state.items, category, state.searchKeyword),
      selectedIndex: 0,
    }))
  },

  // 设置搜索关键词
  setSearchKeyword: (keyword) => {
    set((state) => ({
      searchKeyword: keyword,
      filteredItems: filterItems(state.items, state.currentCategory, keyword),
      selectedIndex: 0,
    }))
  },

  // 设置选中索引
  setSelectedIndex: (index) => {
    set({ selectedIndex: index })
  },

  // 粘贴项目
  pasteItem: async (id: string) => {
    const item = get().items.find((i: ClipboardItem) => i.id === id)
    if (!item) return
    
    // 调用 Tauri 后端粘贴
    try {
      await tauriPasteItem(item.content, item.type)
    } catch (error) {
      console.error('粘贴失败:', error)
    }
  },

  // 清空历史
  clearHistory: () => {
    // 调用后端清空
    tauriClearHistory().catch(err => console.error('清空历史失败:', err))
    
    set((state) => {
      // 保留置顶和收藏的项目
      const keepItems = state.items.filter((item: ClipboardItem) => item.isPinned || item.isFavorite)
      return {
        items: keepItems,
        filteredItems: filterItems(keepItems, state.currentCategory, state.searchKeyword),
        selectedIndex: 0,
      }
    })
  },

  // 移动项目（拖拽排序）
  moveItem: (fromIndex, toIndex) => {
    set((state) => {
      const newItems = [...state.items]
      const [movedItem] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, movedItem)
      return {
        items: newItems,
        filteredItems: filterItems(newItems, state.currentCategory, state.searchKeyword),
      }
    })
  },
}))

// 过滤项目
function filterItems(
  items: ClipboardItem[],
  category: CategoryType,
  keyword: string
): ClipboardItem[] {
  let filtered = items

  // 按分类过滤
  switch (category) {
    case 'text':
      filtered = filtered.filter((item) => item.type === 'text')
      break
    case 'image':
      filtered = filtered.filter((item) => item.type === 'image')
      break
    case 'file':
      filtered = filtered.filter((item) => item.type === 'file')
      break
    case 'url':
      filtered = filtered.filter((item) => item.type === 'url')
      break
    case 'favorite':
      filtered = filtered.filter((item) => item.isFavorite)
      break
    case 'quickReply':
      filtered = filtered.filter((item) => item.isQuickReply)
      break
  }

  // 按关键词过滤
  if (keyword.trim()) {
    const lowerKeyword = keyword.toLowerCase()
    filtered = filtered.filter((item) =>
      item.content.toLowerCase().includes(lowerKeyword) ||
      item.sourceApp?.toLowerCase().includes(lowerKeyword) ||
      item.urlTitle?.toLowerCase().includes(lowerKeyword)
    )
  }

  return filtered
}
