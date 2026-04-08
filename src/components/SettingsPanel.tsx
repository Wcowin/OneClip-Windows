//
//  SettingsPanel.tsx
//  OneClip Windows
//
//  Created by Wcowin on 2025/12/12.
//  设置面板组件
//

import { useState, useEffect } from 'react'
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
  RotateCcw,
  FolderOpen,
  Cloud,
  Check,
  Plus
} from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useClipboardStore } from '../stores/clipboardStore'
import {
  setSyncDirectory,
  getSyncDirectory,
  setAutostart,
  getAutostart,
  setMonitorEnabled,
  setExcludedApps,
  limitHistoryCount,
  cleanupExpired,
  checkForUpdates,
  downloadAndInstallUpdate
} from '../lib/tauri'

// 同步目录选择器组件
function SyncDirectorySelector() {
  const [syncDir, setSyncDir] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { loadItems } = useClipboardStore()

  useEffect(() => {
    getSyncDirectory().then((dir) => {
      setSyncDir(dir)
      if (dir) setInputValue(dir)
    })
  }, [])

  const handleSetDirectory = async () => {
    if (!inputValue.trim()) return
    try {
      await setSyncDirectory(inputValue.trim())
      setSyncDir(inputValue.trim())
      setStatus('success')
      setErrorMsg('')
      await loadItems()
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(e.toString())
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setStatus('idle') }}
          placeholder="例如: D:\OneDrive\OneClip"
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200
                     dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSetDirectory}
          className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600
                     transition-colors flex items-center gap-1"
        >
          <FolderOpen className="w-4 h-4" />
          <span>设置</span>
        </button>
      </div>
      {status === 'success' && (
        <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
          <Check className="w-3 h-3" />
          <span>已连接到数据目录</span>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-2 text-xs text-red-500">{errorMsg}</div>
      )}
      {syncDir && status !== 'error' && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
          当前: {syncDir}
        </div>
      )}
    </div>
  )
}

// 开机自启动组件
function AutostartToggle({ Toggle, renderSettingItem }: {
  Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }>,
  renderSettingItem: (label: string, desc: string, control: React.ReactNode) => React.ReactNode
}) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    getAutostart().then(setEnabled).catch(() => {})
  }, [])

  const handleChange = async (value: boolean) => {
    try {
      await setAutostart(value)
      setEnabled(value)
    } catch (e) {
      console.error('设置自启动失败:', e)
    }
  }

  return renderSettingItem(
    '开机自启动',
    '系统启动时自动运行 OneClip',
    <Toggle checked={enabled} onChange={handleChange} />
  )
}

// 排除应用管理组件
function ExcludedAppsManager({
  excludedApps,
  addExcludedApp,
  removeExcludedApp
}: {
  excludedApps: string[]
  addExcludedApp: (app: string) => void
  removeExcludedApp: (app: string) => void
}) {
  const [newApp, setNewApp] = useState('')

  const handleAdd = async () => {
    const app = newApp.trim()
    if (!app) return
    addExcludedApp(app)
    setNewApp('')
    // 同步到后端
    try {
      await setExcludedApps([...excludedApps, app])
    } catch (e) {
      console.error('设置排除应用失败:', e)
    }
  }

  const handleRemove = async (app: string) => {
    removeExcludedApp(app)
    // 同步到后端
    try {
      await setExcludedApps(excludedApps.filter(a => a !== app))
    } catch (e) {
      console.error('设置排除应用失败:', e)
    }
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
        排除应用
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        来自这些应用的复制内容将不会被记录
      </div>

      {/* 添加新应用 */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newApp}
          onChange={(e) => setNewApp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="输入应用名称，如 Chrome"
          className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200
                     dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600
                     transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 已排除的应用列表 */}
      {excludedApps.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {excludedApps.map((app) => (
            <span
              key={app}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-gray-600
                         text-gray-700 dark:text-gray-200 text-xs rounded-full"
            >
              {app}
              <button
                onClick={() => handleRemove(app)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          暂无排除的应用
        </div>
      )}
    </div>
  )
}

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'appearance' | 'shortcuts' | 'behavior' | 'data' | 'about'

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [updateBusy, setUpdateBusy] = useState(false)
  
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
    quickPasteShortcut,
    setQuickPasteShortcut,
    monitorEnabled,
    setMonitorEnabled: setMonitorEnabled_store,
    autoPaste,
    setAutoPaste,
    pasteAsPlain,
    setPasteAsPlain,
    windowPosition,
    setWindowPosition,
    excludedApps,
    addExcludedApp,
    removeExcludedApp,
    resetSettings,
  } = useSettingsStore()

  const { clearHistory, items, loadItems } = useClipboardStore()

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
            {renderSettingItem(
              '快速粘贴快捷键',
              '呼出独立快速粘贴面板的快捷键',
              <input
                type="text"
                value={quickPasteShortcut}
                onChange={(e) => setQuickPasteShortcut(e.target.value)}
                className="w-32 px-3 py-1.5 text-sm text-center bg-gray-100 dark:bg-gray-700 
                           border-0 rounded-lg text-gray-700 dark:text-gray-200
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ctrl+;"
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
        // 处理监控开关变化
        const handleMonitorChange = async (enabled: boolean) => {
          setMonitorEnabled_store(enabled)
          try {
            await setMonitorEnabled(enabled)
          } catch (e) {
            console.error('设置监控开关失败:', e)
          }
        }

        // 处理最大历史数量变化
        const handleMaxHistoryChange = async (count: number) => {
          setMaxHistoryCount(count)
          try {
            const deleted = await limitHistoryCount(count)
            if (deleted > 0) {
              loadItems() // 重新加载列表
            }
          } catch (e) {
            console.error('限制历史数量失败:', e)
          }
        }

        // 处理自动清理天数变化
        const handleAutoClearChange = async (days: number) => {
          setAutoClearDays(days)
          if (days > 0) {
            try {
              const deleted = await cleanupExpired(days)
              if (deleted > 0) {
                loadItems() // 重新加载列表
              }
            } catch (e) {
              console.error('清理过期记录失败:', e)
            }
          }
        }

        return (
          <div>
            <AutostartToggle Toggle={Toggle} renderSettingItem={renderSettingItem} />
            {renderSettingItem(
              '剪贴板监控',
              '自动记录复制的内容',
              <Toggle checked={monitorEnabled} onChange={handleMonitorChange} />
            )}
            {renderSettingItem(
              '自动粘贴',
              '选择触发粘贴的方式',
              <Select
                value={autoPaste}
                options={[
                  { value: 'none', label: '不自动粘贴' },
                  { value: 'single', label: '单击粘贴' },
                  { value: 'double', label: '双击粘贴' },
                ]}
                onChange={setAutoPaste}
              />
            )}
            {renderSettingItem(
              '粘贴为纯文本',
              '粘贴时去除格式',
              <Toggle checked={pasteAsPlain} onChange={setPasteAsPlain} />
            )}
            {renderSettingItem(
              '音效提示',
              '操作时播放提示音',
              <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
            )}
            {renderSettingItem(
              '窗口位置',
              '窗口显示的位置',
              <Select
                value={windowPosition}
                options={[
                  { value: 'cursor', label: '跟随光标' },
                  { value: 'center', label: '屏幕居中' },
                  { value: 'remember', label: '记住位置' },
                ]}
                onChange={(v) => setWindowPosition(v as any)}
              />
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
                onChange={(v) => handleMaxHistoryChange(Number(v))}
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
                onChange={(v) => handleAutoClearChange(Number(v))}
              />
            )}

            {/* 排除应用设置 */}
            <ExcludedAppsManager
              excludedApps={excludedApps}
              addExcludedApp={addExcludedApp}
              removeExcludedApp={removeExcludedApp}
            />
          </div>
        )

      case 'data':
        // 计算统计数据
        const stats = {
          total: items.length,
          text: items.filter(i => i.type === 'text').length,
          image: items.filter(i => i.type === 'image').length,
          url: items.filter(i => i.type === 'url').length,
          file: items.filter(i => i.type === 'file').length,
          pinned: items.filter(i => i.isPinned).length,
          favorite: items.filter(i => i.isFavorite).length,
        }

        return (
          <div>
            {/* 同步目录设置 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  数据同步目录
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                选择 Mac 版 OneClip 数据目录（通过云盘同步），实现跨设备数据互通
              </p>
              <SyncDirectorySelector />
            </div>

            {/* 数据统计 - 借鉴 EcoPaste */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  数据统计
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{stats.total}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">总计</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-semibold text-blue-500">{stats.text}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">文本</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-semibold text-green-500">{stats.image}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">图片</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-semibold text-purple-500">{stats.url}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">链接</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-semibold text-orange-500">{stats.file}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">文件</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-semibold text-primary-500">{stats.pinned}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">置顶</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-semibold text-yellow-500">{stats.favorite}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">收藏</div>
                </div>
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

            <div className="mt-4 space-y-2">
              <button
                disabled={updateBusy}
                onClick={async () => {
                  setUpdateBusy(true)
                  setUpdateStatus('正在检查更新...')
                  try {
                    const result = await checkForUpdates()
                    if (!result.available) {
                      setUpdateStatus('当前已是最新版本')
                    } else {
                      setUpdateStatus(
                        `发现新版本 ${result.version}（当前 ${result.currentVersion}）`
                      )
                    }
                  } catch (e: any) {
                    setUpdateStatus(`检查更新失败: ${e?.toString?.() ?? e}`)
                  } finally {
                    setUpdateBusy(false)
                  }
                }}
                className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-60"
              >
                检查更新
              </button>
              <button
                disabled={updateBusy}
                onClick={async () => {
                  setUpdateBusy(true)
                  setUpdateStatus('正在下载并安装更新...')
                  try {
                    await downloadAndInstallUpdate()
                    setUpdateStatus('更新安装流程已完成，请按安装器提示操作')
                  } catch (e: any) {
                    setUpdateStatus(`安装更新失败: ${e?.toString?.() ?? e}`)
                  } finally {
                    setUpdateBusy(false)
                  }
                }}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-800 disabled:opacity-60"
              >
                下载并安装更新
              </button>
              {updateStatus && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                  {updateStatus}
                </div>
              )}
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
