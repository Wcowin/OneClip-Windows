/**
 * OneClip 核心类型定义
 * 与 macOS 版保持数据结构兼容
 */

// 剪贴板项目类型
export type ClipboardItemType = 
  | 'text'      // 纯文本
  | 'image'     // 图片
  | 'file'      // 文件
  | 'url'       // 链接
  | 'color'     // 颜色
  | 'rtf'       // 富文本

// 剪贴板项目
export interface ClipboardItem {
  id: string                    // 唯一标识
  type: ClipboardItemType       // 类型
  content: string               // 文本内容或文件路径
  preview?: string              // 预览文本（用于大文本）
  timestamp: number             // 时间戳
  sourceApp?: string            // 来源应用
  sourceAppIcon?: string        // 来源应用图标路径
  isPinned: boolean             // 是否置顶
  isFavorite: boolean           // 是否收藏
  isQuickReply: boolean         // 是否为快捷回复
  category?: string             // 分类
  tags?: string[]               // 标签
  note?: string                 // 备注（借鉴 EcoPaste）

  // 图片相关
  imageWidth?: number
  imageHeight?: number
  imagePath?: string            // 图片存储路径
  thumbnailPath?: string        // 缩略图路径

  // 文件相关
  fileName?: string
  fileSize?: number
  filePath?: string

  // 颜色相关
  colorHex?: string
  colorRGB?: string

  // 链接相关
  urlTitle?: string
  urlFavicon?: string
}

// 分类类型
export type CategoryType = 
  | 'all'           // 全部
  | 'text'          // 文本
  | 'image'         // 图片
  | 'file'          // 文件
  | 'url'           // 链接
  | 'favorite'      // 收藏
  | 'quickReply'    // 快捷回复

// 视图模式
export type ViewMode = 'list' | 'grid'

// 排序方式
export type SortOrder = 'newest' | 'oldest' | 'alphabetical'

// 自动粘贴模式
export type AutoPasteMode = 'none' | 'single' | 'double'

// 设置项
export interface Settings {
  // 外观
  isDarkMode: boolean
  viewMode: ViewMode
  fontSize: number

  // 行为
  maxHistoryCount: number
  autoClearDays: number
  soundEnabled: boolean
  autoPaste: AutoPasteMode  // 自动粘贴模式（借鉴 EcoPaste）
  pasteAsPlain: boolean     // 粘贴为纯文本

  // 快捷键
  globalShortcut: string
  quickPasteShortcut: string

  // 监控
  monitorEnabled: boolean
  excludedApps: string[]

  // 窗口
  windowWidth: number
  windowHeight: number
  windowPosition: 'center' | 'cursor' | 'remember'
  windowX?: number          // 记住的窗口位置
  windowY?: number
}

// 搜索过滤器
export interface SearchFilter {
  keyword: string
  category: CategoryType
  dateRange?: {
    start: Date
    end: Date
  }
  sourceApp?: string
}
