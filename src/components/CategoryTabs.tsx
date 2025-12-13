import { 
  Layers, 
  FileText, 
  Image, 
  FolderOpen, 
  Link, 
  Star, 
  Zap 
} from 'lucide-react'
import { useClipboardStore } from '../stores/clipboardStore'
import type { CategoryType } from '../types'

/**
 * 分类标签组件
 * 用于切换不同类型的剪贴板内容
 */

interface CategoryConfig {
  id: CategoryType
  label: string
  icon: React.ReactNode
}

const categories: CategoryConfig[] = [
  { id: 'all', label: '全部', icon: <Layers className="w-4 h-4" /> },
  { id: 'text', label: '文本', icon: <FileText className="w-4 h-4" /> },
  { id: 'image', label: '图片', icon: <Image className="w-4 h-4" /> },
  { id: 'file', label: '文件', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'url', label: '链接', icon: <Link className="w-4 h-4" /> },
  { id: 'favorite', label: '收藏', icon: <Star className="w-4 h-4" /> },
  { id: 'quickReply', label: '快捷', icon: <Zap className="w-4 h-4" /> },
]

export default function CategoryTabs() {
  const { currentCategory, setCategory, items } = useClipboardStore()

  // 计算各分类数量
  const getCategoryCount = (category: CategoryType): number => {
    switch (category) {
      case 'all':
        return items.length
      case 'text':
        return items.filter((item) => item.type === 'text').length
      case 'image':
        return items.filter((item) => item.type === 'image').length
      case 'file':
        return items.filter((item) => item.type === 'file').length
      case 'url':
        return items.filter((item) => item.type === 'url').length
      case 'favorite':
        return items.filter((item) => item.isFavorite).length
      case 'quickReply':
        return items.filter((item) => item.isQuickReply).length
      default:
        return 0
    }
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {categories.map((category) => {
        const isActive = currentCategory === category.id
        const count = getCategoryCount(category.id)

        return (
          <button
            key={category.id}
            onClick={() => setCategory(category.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-150 whitespace-nowrap
              ${isActive
                ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            {category.icon}
            <span>{category.label}</span>
            {count > 0 && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive
                  ? 'bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }
              `}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
