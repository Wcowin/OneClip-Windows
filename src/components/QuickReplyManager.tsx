//
//  QuickReplyManager.tsx
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  快捷回复管理组件
//

import { useState } from 'react'
import { 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  FolderPlus,
  Zap
} from 'lucide-react'
import { useClipboardStore } from '../stores/clipboardStore'
import type { ClipboardItem } from '../types'

interface QuickReplyManagerProps {
  isOpen: boolean
  onClose: () => void
}

export default function QuickReplyManager({ isOpen, onClose }: QuickReplyManagerProps) {
  const { items, addItem, deleteItem } = useClipboardStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('')

  // 获取快捷回复列表
  const quickReplies = items.filter(item => item.isQuickReply)
  
  // 获取所有分类
  const categories = [...new Set(quickReplies.map(item => item.category).filter(Boolean))]

  if (!isOpen) return null

  // 开始编辑
  const startEdit = (item: ClipboardItem) => {
    setEditingId(item.id)
    setEditContent(item.content)
    setEditCategory(item.category || '')
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editingId || !editContent.trim()) return
    
    // TODO: 调用后端更新
    console.log('保存编辑:', editingId, editContent, editCategory)
    
    setEditingId(null)
    setEditContent('')
    setEditCategory('')
  }

  // 添加新快捷回复
  const addNewQuickReply = () => {
    if (!newContent.trim()) return

    const newItem: ClipboardItem = {
      id: Date.now().toString(),
      type: 'text',
      content: newContent,
      timestamp: Date.now(),
      isPinned: false,
      isFavorite: false,
      isQuickReply: true,
      category: newCategory || undefined,
    }

    addItem(newItem)
    setNewContent('')
    setNewCategory('')
    setIsAdding(false)
  }

  // 删除快捷回复
  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条快捷回复吗？')) {
      deleteItem(id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[520px] max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">快捷回复管理</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                       text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                       bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>添加</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                       bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                       rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>新建分类</span>
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            共 {quickReplies.length} 条
          </span>
        </div>

        {/* 添加新快捷回复 */}
        {isAdding && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="输入快捷回复内容..."
              className="w-full h-24 px-3 py-2 text-sm bg-white dark:bg-gray-800 
                         border border-gray-200 dark:border-gray-600 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-primary-500
                         text-gray-700 dark:text-gray-200 resize-none"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="分类（可选）"
                className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 
                           border border-gray-200 dark:border-gray-600 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           text-gray-700 dark:text-gray-200"
                list="categories"
              />
              <datalist id="categories">
                {categories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              <button
                onClick={addNewQuickReply}
                className="px-4 py-1.5 text-sm bg-primary-500 text-white rounded-lg
                           hover:bg-primary-600 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewContent('')
                  setNewCategory('')
                }}
                className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 
                           text-gray-600 dark:text-gray-300 rounded-lg
                           hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 快捷回复列表 */}
        <div className="overflow-y-auto max-h-[50vh] p-2">
          {quickReplies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Zap className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">暂无快捷回复</p>
              <p className="text-xs mt-1">点击上方"添加"按钮创建</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quickReplies.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg group"
                >
                  {editingId === item.id ? (
                    // 编辑模式
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-20 px-3 py-2 text-sm bg-white dark:bg-gray-800 
                                   border border-gray-200 dark:border-gray-600 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-primary-500
                                   text-gray-700 dark:text-gray-200 resize-none"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          placeholder="分类"
                          className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 
                                     border border-gray-200 dark:border-gray-600 rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-primary-500
                                     text-gray-700 dark:text-gray-200"
                        />
                        <button
                          onClick={saveEdit}
                          className="p-1.5 text-primary-500 hover:bg-primary-50 
                                     dark:hover:bg-primary-900/30 rounded-lg"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 
                                     dark:hover:bg-gray-700 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 显示模式
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-3">
                          {item.content}
                        </p>
                        {item.category && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs 
                                           bg-gray-200 dark:bg-gray-700 text-gray-600 
                                           dark:text-gray-300 rounded">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-gray-500 hover:bg-gray-200 
                                     dark:hover:bg-gray-700 rounded-lg"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-500
                                     dark:hover:bg-red-900/30 rounded-lg"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
