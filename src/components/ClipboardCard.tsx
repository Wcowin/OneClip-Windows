import { useState, useEffect, useRef } from 'react'
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
  Edit2,
  ClipboardPaste,
  MoreHorizontal
} from 'lucide-react'
import { useClipboardStore } from '../stores/clipboardStore'
import type { ClipboardItem, ViewMode } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { getImageFullPath, isTauriEnv } from '../lib/tauri'

/**
 * 右键菜单组件
 */
interface ContextMenuProps {
  x: number
  y: number
  item: ClipboardItem
  onClose: () => void
  onEdit?: (item: ClipboardItem) => void
}

function ContextMenu({ x, y, item, onClose, onEdit }: ContextMenuProps) {
  const { togglePin, toggleFavorite, deleteItem, pasteItem } = useClipboardStore()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const menuItems = [
    {
      icon: <ClipboardPaste className="w-4 h-4" />,
      label: '粘贴',
      shortcut: 'Enter',
      onClick: () => { pasteItem(item.id); onClose() }
    },
    {
      icon: <Copy className="w-4 h-4" />,
      label: '复制',
      shortcut: 'Ctrl+C',
      onClick: () => { navigator.clipboard.writeText(item.content); onClose() }
    },
    { divider: true },
    {
      icon: <Pin className={`w-4 h-4 ${item.isPinned ? 'text-primary-500' : ''}`} />,
      label: item.isPinned ? '取消置顶' : '置顶',
      onClick: () => { togglePin(item.id); onClose() }
    },
    {
      icon: <Star className={`w-4 h-4 ${item.isFavorite ? 'text-yellow-500' : ''}`} />,
      label: item.isFavorite ? '取消收藏' : '收藏',
      onClick: () => { toggleFavorite(item.id); onClose() }
    },
    ...(item.type === 'text' && onEdit ? [{
      icon: <Edit2 className="w-4 h-4" />,
      label: '编辑',
      shortcut: 'E',
      onClick: () => { onEdit(item); onClose() }
    }] : []),
    { divider: true },
    {
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      label: '删除',
      shortcut: 'Del',
      className: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
      onClick: () => { deleteItem(item.id); onClose() }
    },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      style={{ left: x, top: y }}
    >
      {menuItems.map((menuItem, index) => {
        if ('divider' in menuItem && menuItem.divider) {
          return <div key={index} className="my-1 border-t border-gray-200 dark:border-gray-700" />
        }
        const { icon, label, shortcut, onClick, className } = menuItem as any
        return (
          <button
            key={index}
            onClick={onClick}
            className={`w-full px-3 py-1.5 flex items-center gap-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${className || ''}`}
          >
            {icon}
            <span className="flex-1 text-left">{label}</span>
            {shortcut && (
              <span className="text-xs text-gray-400">{shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * 图片预览组件
 * 优先使用缩略图以提高性能
 */
function ImagePreview({ item }: { item: ClipboardItem }) {
  const [imageSrc, setImageSrc] = useState<string>('')

  useEffect(() => {
    const loadImage = async () => {
      // 优先使用缩略图，如果没有则使用原图
      const relativePath = item.thumbnailPath || item.imagePath || item.filePath
      if (!relativePath) return

      if (isTauriEnv()) {
        try {
          const fullPath = await getImageFullPath(relativePath)
          const { convertFileSrc } = await import('@tauri-apps/api/core')
          setImageSrc(convertFileSrc(fullPath))
        } catch {
          setImageSrc('')
        }
      }
    }
    loadImage()
  }, [item.thumbnailPath, item.imagePath, item.filePath])

  return (
    <div className="flex items-center gap-2">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt="预览"
          className="w-12 h-12 object-cover rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
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
}

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
  searchKeyword?: string  // 搜索关键词，用于高亮
}

/**
 * 高亮文本组件 - 借鉴 EcoPaste 的 Marker 组件
 */
function HighlightText({ text, keyword }: { text: string; keyword?: string }) {
  if (!keyword || !keyword.trim()) {
    return <>{text}</>
  }

  const parts: React.ReactNode[] = []
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  let lastIndex = 0

  let index = lowerText.indexOf(lowerKeyword)
  while (index !== -1) {
    // 添加匹配前的文本
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }
    // 添加高亮的匹配文本
    parts.push(
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-600 text-inherit rounded px-0.5">
        {text.slice(index, index + keyword.length)}
      </mark>
    )
    lastIndex = index + keyword.length
    index = lowerText.indexOf(lowerKeyword, lastIndex)
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

export default function ClipboardCard({
  item,
  isSelected,
  onClick,
  viewMode,
  onEdit,
  searchKeyword,
}: ClipboardCardProps) {
  const { togglePin, toggleFavorite, deleteItem, pasteItem } = useClipboardStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // 获取自动粘贴设置（动态导入避免循环依赖）
  const getAutoPasteSetting = () => {
    try {
      const stored = localStorage.getItem('oneclip-settings')
      if (stored) {
        const settings = JSON.parse(stored)
        return settings.state?.autoPaste || 'double'
      }
    } catch {
      // ignore
    }
    return 'double'
  }

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(item.timestamp), {
    addSuffix: true,
    locale: zhCN,
  })

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 确保菜单不会超出窗口边界
    const x = Math.min(e.clientX, window.innerWidth - 200)
    const y = Math.min(e.clientY, window.innerHeight - 250)
    setContextMenu({ x, y })
  }

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
              <HighlightText text={item.urlTitle || item.content} keyword={searchKeyword} />
            </div>
            <div className="text-xs text-gray-500 truncate">
              <HighlightText text={item.content} keyword={searchKeyword} />
            </div>
          </div>
        )
      case 'image':
        return <ImagePreview item={item} />
      case 'file':
        return (
          <div className="flex items-center gap-2">
            <FolderOpen className="w-8 h-8 text-orange-500" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                <HighlightText text={item.fileName || item.content} keyword={searchKeyword} />
              </div>
              {item.fileSize && (
                <div className="text-xs text-gray-500">
                  {formatFileSize(item.fileSize)}
                </div>
              )}
            </div>
          </div>
        )
      default:
        return (
          <div className={`text-sm text-gray-700 dark:text-gray-300 ${viewMode === 'list' ? 'line-clamp-2' : 'line-clamp-3'}`}>
            <HighlightText text={item.content} keyword={searchKeyword} />
          </div>
        )
    }
  }

  // 格式化文件大小
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  }

  // 单击处理 - 根据设置决定是否粘贴
  const handleClick = () => {
    onClick()
    const autoPaste = getAutoPasteSetting()
    if (autoPaste === 'single') {
      pasteItem(item.id)
    }
  }

  // 双击处理 - 根据设置决定是否粘贴
  const handleDoubleClick = () => {
    const autoPaste = getAutoPasteSetting()
    if (autoPaste === 'double') {
      pasteItem(item.id)
    }
  }

  return (
    <>
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
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

    {/* 右键菜单 */}
    {contextMenu && (
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        item={item}
        onClose={() => setContextMenu(null)}
        onEdit={onEdit}
      />
    )}
    </>
  )
}
