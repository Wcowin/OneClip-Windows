import { 
  Pin, 
  Star, 
  Trash2, 
  Copy, 
  FileText, 
  Image, 
  Link, 
  FolderOpen,
  Palette,
  Edit2
} from 'lucide-react'
import { useClipboardStore } from '../stores/clipboardStore'
import type { ClipboardItem, ViewMode } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

/**
 * 剪贴板卡片组件
 * 显示单个剪贴板项目
 */

interface ClipboardCardProps {
  item: ClipboardItem
  isSelected: boolean
  onClick: () => void
  viewMode: ViewMode
  onEdit?: (item: ClipboardItem) => void
}

export default function ClipboardCard({
  item,
  isSelected,
  onClick,
  viewMode,
  onEdit,
}: ClipboardCardProps) {
  const { togglePin, toggleFavorite, deleteItem, pasteItem } = useClipboardStore()

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(item.timestamp), {
    addSuffix: true,
    locale: zhCN,
  })

  // 获取类型图标
  const getTypeIcon = () => {
    switch (item.type) {
      case 'text':
        return <FileText className="w-4 h-4 text-blue-500" />
      case 'image':
        return <Image className="w-4 h-4 text-green-500" />
      case 'url':
        return <Link className="w-4 h-4 text-purple-500" />
      case 'file':
        return <FolderOpen className="w-4 h-4 text-orange-500" />
      case 'color':
        return <Palette className="w-4 h-4 text-pink-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  // 渲染内容预览
  const renderContent = () => {
    switch (item.type) {
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600"
              style={{ backgroundColor: item.colorHex }}
            />
            <div>
              <div className="text-sm font-mono">{item.colorHex}</div>
              <div className="text-xs text-gray-500">{item.colorRGB}</div>
            </div>
          </div>
        )
      case 'url':
        return (
          <div>
            <div className="text-sm text-primary-600 dark:text-primary-400 truncate">
              {item.urlTitle || item.content}
            </div>
            <div className="text-xs text-gray-500 truncate">{item.content}</div>
          </div>
        )
      case 'image':
        return (
          <div className="flex items-center gap-2">
            {item.thumbnailPath ? (
              <img
                src={item.thumbnailPath}
                alt="预览"
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                <Image className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {item.imageWidth && item.imageHeight
                ? `${item.imageWidth} × ${item.imageHeight}`
                : '图片'}
            </div>
          </div>
        )
      default:
        return (
          <div className={`text-sm text-gray-700 dark:text-gray-300 ${viewMode === 'list' ? 'line-clamp-2' : 'line-clamp-3'}`}>
            {item.content}
          </div>
        )
    }
  }

  // 双击粘贴
  const handleDoubleClick = () => {
    pasteItem(item.id)
  }

  return (
    <div
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      className={`
        clip-card group relative p-3 rounded-xl cursor-pointer
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700
        ${isSelected ? 'selected' : ''}
      `}
    >
      {/* 置顶标记 */}
      {item.isPinned && (
        <div className="absolute top-2 right-2">
          <Pin className="w-3.5 h-3.5 text-primary-500 fill-primary-500" />
        </div>
      )}

      {/* 内容区 */}
      <div className="flex items-start gap-2">
        {/* 类型图标 */}
        <div className="mt-0.5">{getTypeIcon()}</div>

        {/* 主内容 */}
        <div className="flex-1 min-w-0">
          {renderContent()}

          {/* 元信息 */}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            {item.sourceApp && (
              <span className="truncate">{item.sourceApp}</span>
            )}
            <span>·</span>
            <span className="whitespace-nowrap">{timeAgo}</span>
            {item.category && (
              <>
                <span>·</span>
                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                  {item.category}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 悬停操作按钮 */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            togglePin(item.id)
          }}
          className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            item.isPinned ? 'text-primary-500' : 'text-gray-400'
          }`}
          title={item.isPinned ? '取消置顶' : '置顶'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(item.id)
          }}
          className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
            item.isFavorite ? 'text-yellow-500' : 'text-gray-400'
          }`}
          title={item.isFavorite ? '取消收藏' : '收藏'}
        >
          <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-yellow-500' : ''}`} />
        </button>

        {/* 编辑按钮 - 仅文本类型显示 */}
        {item.type === 'text' && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            title="编辑 (E)"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(item.content)
          }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          title="复制"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            deleteItem(item.id)
          }}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
