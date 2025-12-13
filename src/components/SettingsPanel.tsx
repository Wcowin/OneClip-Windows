//
//  SettingsPanel.tsx
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  设置面板组件
//

import { useState } from 'react'
import { 
  X, 
  Palette, 
  Keyboard, 
  Bell, 
  Database, 
  Info,
  Monitor,
  Moon,
  Sun,
  Trash2,
  RotateCcw
} from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useClipboardStore } from '../stores/clipboardStore'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'appearance' | 'shortcuts' | 'behavior' | 'data' | 'about'

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  
  const {
    isDarkMode,
    setDarkMode,
    viewMode,
    setViewMode,
    fontSize,
    setFontSize,
    maxHistoryCount,
    setMaxHistoryCount,
    autoClearDays,
    setAutoClearDays,
    soundEnabled,
    setSoundEnabled,
    globalShortcut,
    setGlobalShortcut,
    monitorEnabled,
    setMonitorEnabled,
    resetSettings,
  } = useSettingsStore()
  
  const { clearHistory, items } = useClipboardStore()

  if (!isOpen) return null

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: '外观', icon: <Palette className="w-4 h-4" /> },
    { id: 'shortcuts', label: '快捷键', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'behavior', label: '行为', icon: <Bell className="w-4 h-4" /> },
    { id: 'data', label: '数据', icon: <Database className="w-4 h-4" /> },
    { id: 'about', label: '关于', icon: <Info className="w-4 h-4" /> },
  ]

  // 渲染设置项
  const renderSettingItem = (
    label: string,
    description: string,
    control: React.ReactNode
  ) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  )

  // 切换开关组件
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative w-11 h-6 rounded-full transition-colors duration-200
        ${checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}
      `}
    >
      <span
        className={`
          absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )

  // 选择器组件
  const Select = ({ 
    value, 
    options, 
    onChange 
  }: { 
    value: string | number
    options: { value: string | number; label: string }[]
    onChange: (v: any) => void 
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg
                 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )

  // 渲染各标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div>
            {renderSettingItem(
              '深色模式',
              '切换应用的明暗主题',
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-gray-400" />
                <Toggle checked={isDarkMode} onChange={setDarkMode} />
                <Moon className="w-4 h-4 text-gray-400" />
              </div>
            )}
            {renderSettingItem(
              '视图模式',
              '选择列表或网格布局',
              <Select
                value={viewMode}
                options={[
                  { value: 'list', label: '列表' },
                  { value: 'grid', label: '网格' },
                ]}
                onChange={setViewMode}
              />
            )}
            {renderSettingItem(
              '字体大小',
              '调整界面文字大小',
              <Select
                value={fontSize}
                options={[
                  { value: 12, label: '小' },
                  { value: 14, label: '中' },
                  { value: 16, label: '大' },
                ]}
                onChange={(v) => setFontSize(Number(v))}
              />
            )}
          </div>
        )

      case 'shortcuts':
        return (
          <div>
            {renderSettingItem(
              '全局快捷键',
              '呼出 OneClip 窗口的快捷键',
              <input
                type="text"
                value={globalShortcut}
                onChange={(e) => setGlobalShortcut(e.target.value)}
                className="w-32 px-3 py-1.5 text-sm text-center bg-gray-100 dark:bg-gray-700 
                           border-0 rounded-lg text-gray-700 dark:text-gray-200
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ctrl+Shift+V"
              />
            )}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">快捷键说明</div>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>↑ / ↓</span>
                  <span>上下选择</span>
                </div>
                <div className="flex justify-between">
                  <span>Enter</span>
                  <span>粘贴选中项</span>
                </div>
                <div className="flex justify-between">
                  <span>Esc</span>
                  <span>关闭窗口</span>
                </div>
                <div className="flex justify-between">
                  <span>Ctrl+F</span>
                  <span>搜索</span>
                </div>
                <div className="flex justify-between">
                  <span>Delete</span>
                  <span>删除选中项</span>
                </div>
              </div>
            </div>
          </div>
        )

      case 'behavior':
        return (
          <div>
            {renderSettingItem(
              '剪贴板监控',
              '自动记录复制的内容',
              <Toggle checked={monitorEnabled} onChange={setMonitorEnabled} />
            )}
            {renderSettingItem(
              '音效提示',
              '操作时播放提示音',
              <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
            )}
            {renderSettingItem(
              '最大历史数量',
              '保留的最大记录条数',
              <Select
                value={maxHistoryCount}
                options={[
                  { value: 100, label: '100 条' },
                  { value: 500, label: '500 条' },
                  { value: 1000, label: '1000 条' },
                  { value: 5000, label: '5000 条' },
                ]}
                onChange={(v) => setMaxHistoryCount(Number(v))}
              />
            )}
            {renderSettingItem(
              '自动清理',
              '自动删除超过指定天数的记录',
              <Select
                value={autoClearDays}
                options={[
                  { value: 0, label: '不清理' },
                  { value: 7, label: '7 天' },
                  { value: 30, label: '30 天' },
                  { value: 90, label: '90 天' },
                ]}
                onChange={(v) => setAutoClearDays(Number(v))}
              />
            )}
          </div>
        )

      case 'data':
        return (
          <div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    剪贴板记录
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    当前共 {items.length} 条记录
                  </div>
                </div>
                <Monitor className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('确定要清空所有历史记录吗？置顶和收藏的项目将被保留。')) {
                  clearHistory()
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                         bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400
                         rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>清空历史记录</span>
            </button>

            <button
              onClick={() => {
                if (confirm('确定要重置所有设置吗？')) {
                  resetSettings()
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2
                         bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                         rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重置所有设置</span>
            </button>
          </div>
        )

      case 'about':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 
                            flex items-center justify-center">
              <span className="text-white text-2xl font-bold">O</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">OneClip</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Windows 版 v1.0.0</p>
            
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
                <p>智能剪贴板管理工具，让复制粘贴更高效。</p>
                <p>支持文本、图片、文件、链接等多种类型。</p>
                <p>数据与 macOS 版完全兼容。</p>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              <p>© 2025 OneClip. All rights reserved.</p>
              <p className="mt-1">
                联系我们: <a href="mailto:vip@oneclip.cloud" className="text-primary-500 hover:underline">vip@oneclip.cloud</a>
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">设置</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                       text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex">
          {/* 侧边栏 */}
          <div className="w-32 border-r border-gray-200 dark:border-gray-700 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1
                  transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[60vh]">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
