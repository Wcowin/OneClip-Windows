import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewMode, Settings, AutoPasteMode } from '../types'

/**
 * 设置状态管理
 * 使用 zustand/persist 自动持久化到 localStorage
 */

interface SettingsState extends Settings {
  // 操作
  setDarkMode: (isDark: boolean) => void
  toggleDarkMode: () => void
  setViewMode: (mode: ViewMode) => void
  setFontSize: (size: number) => void
  setMaxHistoryCount: (count: number) => void
  setAutoClearDays: (days: number) => void
  setSoundEnabled: (enabled: boolean) => void
  setGlobalShortcut: (shortcut: string) => void
  setMonitorEnabled: (enabled: boolean) => void
  addExcludedApp: (app: string) => void
  removeExcludedApp: (app: string) => void
  setWindowSize: (width: number, height: number) => void
  setWindowPosition: (position: 'center' | 'cursor' | 'remember', x?: number, y?: number) => void
  setAutoPaste: (mode: AutoPasteMode) => void
  setPasteAsPlain: (enabled: boolean) => void
  resetSettings: () => void
}

// 默认设置
const defaultSettings: Settings = {
  isDarkMode: false,
  viewMode: 'list',
  fontSize: 14,
  maxHistoryCount: 1000,
  autoClearDays: 30,
  soundEnabled: true,
  autoPaste: 'double',      // 默认双击粘贴
  pasteAsPlain: false,      // 默认保留格式
  globalShortcut: 'Ctrl+Shift+V',
  monitorEnabled: true,
  excludedApps: [],
  windowWidth: 400,
  windowHeight: 600,
  windowPosition: 'cursor',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      // 设置深色模式
      setDarkMode: (isDark) => set({ isDarkMode: isDark }),
      
      // 切换深色模式
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      // 设置视图模式
      setViewMode: (mode) => set({ viewMode: mode }),

      // 设置字体大小
      setFontSize: (size) => set({ fontSize: size }),

      // 设置最大历史数量
      setMaxHistoryCount: (count) => set({ maxHistoryCount: count }),

      // 设置自动清理天数
      setAutoClearDays: (days) => set({ autoClearDays: days }),

      // 设置音效
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      // 设置全局快捷键
      setGlobalShortcut: (shortcut) => set({ globalShortcut: shortcut }),

      // 设置监控开关
      setMonitorEnabled: (enabled) => set({ monitorEnabled: enabled }),

      // 添加排除应用
      addExcludedApp: (app) =>
        set((state) => ({
          excludedApps: [...state.excludedApps, app],
        })),

      // 移除排除应用
      removeExcludedApp: (app) =>
        set((state) => ({
          excludedApps: state.excludedApps.filter((a) => a !== app),
        })),

      // 设置窗口大小
      setWindowSize: (width, height) =>
        set({ windowWidth: width, windowHeight: height }),

      // 设置窗口位置
      setWindowPosition: (position, x, y) =>
        set({ windowPosition: position, windowX: x, windowY: y }),

      // 设置自动粘贴模式
      setAutoPaste: (mode) => set({ autoPaste: mode }),

      // 设置粘贴为纯文本
      setPasteAsPlain: (enabled) => set({ pasteAsPlain: enabled }),

      // 重置设置
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'oneclip-settings', // localStorage key
    }
  )
)
