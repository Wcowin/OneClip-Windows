//
//  TextEditor.tsx
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  文本编辑组件 - 用于编辑剪贴板内容
//

import { useState, useEffect, useRef } from 'react'
import { X, Save, Copy, RotateCcw } from 'lucide-react'
import { useClipboardStore } from '../stores/clipboardStore'
import type { ClipboardItem } from '../types'

interface TextEditorProps {
  item: ClipboardItem | null
  isOpen: boolean
  onClose: () => void
}

export default function TextEditor({ item, isOpen, onClose }: TextEditorProps) {
  const { updateItem } = useClipboardStore()
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 初始化内容
  useEffect(() => {
    if (item && isOpen) {
      setContent(item.content)
      setOriginalContent(item.content)
      setHasChanges(false)
      // 聚焦到文本框
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      }, 100)
    }
  }, [item, isOpen])

  // 检测变化
  useEffect(() => {
    setHasChanges(content !== originalContent)
  }, [content, originalContent])

  if (!isOpen || !item) return null

  // 保存编辑
  const handleSave = () => {
    if (!hasChanges) return
    updateItem(item.id, { content })
    setOriginalContent(content)
    setHasChanges(false)
    onClose()
  }

  // 重置内容
  const handleReset = () => {
    setContent(originalContent)
  }

  // 复制内容
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
  }

  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  // 统计信息
  const charCount = content.length
  const lineCount = content.split('\n').length
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
    >
      <div className="w-[600px] max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              编辑文本
            </h2>
            {hasChanges && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/50 
                             text-yellow-700 dark:text-yellow-300 rounded">
                未保存
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                       text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 编辑区域 */}
        <div className="flex-1 p-4 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[300px] px-3 py-2 text-sm font-mono
                       bg-gray-50 dark:bg-gray-900 
                       border border-gray-200 dark:border-gray-600 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary-500
                       text-gray-700 dark:text-gray-200 resize-none"
            placeholder="输入文本内容..."
          />
        </div>

        {/* 统计信息 */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 
                        text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
          <span>{charCount} 字符</span>
          <span>{wordCount} 词</span>
          <span>{lineCount} 行</span>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                         bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                         rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>复制</span>
            </button>
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                         bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                         rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重置</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm
                         bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                         rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm
                         bg-primary-500 text-white rounded-lg
                         hover:bg-primary-600 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>保存 (Ctrl+S)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
