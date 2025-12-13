# OneClip Windows 版

基于 Tauri 2.0 + React + TypeScript 的智能剪贴板管理工具。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | React 18 | 组件化 UI |
| **类型系统** | TypeScript | 类型安全 |
| **样式** | TailwindCSS | 原子化 CSS |
| **状态管理** | Zustand | 轻量级状态管理 |
| **图标** | Lucide React | 现代图标库 |
| **后端** | Rust + Tauri 2.0 | 高性能原生应用 |
| **数据库** | SQLite | 与 macOS 版兼容 |

## 功能特性

### 已实现
- ✅ 剪贴板历史记录
- ✅ 智能分类（文本、图片、文件、链接、颜色）
- ✅ 快捷搜索 (Ctrl+F)
- ✅ 置顶和收藏
- ✅ 快捷回复管理
- ✅ 深色/浅色模式
- ✅ 键盘导航 (↑↓ 选择, Enter 粘贴, Delete 删除)
- ✅ 系统托盘
- ✅ 设置面板（外观、快捷键、行为、数据）

### 待完善（需要 Windows 环境）
- 🔧 剪贴板实时监控（Windows API）
- 🔧 全局快捷键绑定
- 🔧 粘贴功能（模拟 Ctrl+V）
- 🔧 应用图标设计

## Windows 完整运行指南

### 第一步：安装开发环境

#### 1.1 安装 Rust（必需）
```powershell
# 方法一：使用 winget（推荐）
winget install Rustlang.Rust.MSVC

# 方法二：从官网下载安装器
# 访问 https://rustup.rs/ 下载 rustup-init.exe
```

安装完成后，**重启终端**，验证安装：
```powershell
rustc --version
cargo --version
```

#### 1.2 安装 Node.js（必需）
```powershell
# 方法一：使用 winget
winget install OpenJS.NodeJS.LTS

# 方法二：从官网下载
# 访问 https://nodejs.org/ 下载 LTS 版本
```

验证安装：
```powershell
node --version
npm --version
```

#### 1.3 安装 Visual Studio Build Tools（必需）
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

安装后，打开 **Visual Studio Installer**，选择：
- ✅ **"使用 C++ 的桌面开发"** 工作负载
- ✅ **Windows 10/11 SDK**

#### 1.4 安装 WebView2（Windows 10 需要）
Windows 11 已内置，Windows 10 需要安装：
```powershell
winget install Microsoft.EdgeWebView2Runtime
```

### 第二步：获取项目代码

将 `OneClip-Windows` 文件夹复制到 Windows 电脑上，例如：
```
C:\Projects\OneClip-Windows
```

### 第三步：安装依赖并运行

```powershell
# 进入项目目录
cd C:\Projects\OneClip-Windows

# 安装前端依赖
npm install

# 开发模式运行（首次编译 Rust 需要 3-5 分钟）
npm run tauri dev
```

### 第四步：构建发布版本

```powershell
# 构建 Windows 安装包
npm run tauri build
```

构建产物位置：
```
src-tauri/target/release/
├── oneclip-windows.exe      # 可执行文件
└── bundle/
    ├── msi/                  # MSI 安装包
    └── nsis/                 # NSIS 安装包
```

---

## 常见问题

### Q1: 编译报错 "linker 'link.exe' not found"
**原因**：未安装 Visual Studio Build Tools
**解决**：安装 Build Tools 并选择 "C++ 桌面开发" 工作负载

### Q2: 编译报错 "error: failed to run custom build command"
**原因**：Rust 工具链不完整
**解决**：
```powershell
rustup update
rustup target add x86_64-pc-windows-msvc
```

### Q3: 运行时白屏
**原因**：WebView2 未安装
**解决**：安装 Microsoft Edge WebView2 Runtime

### Q4: 剪贴板监控不工作
**原因**：需要管理员权限或安全软件拦截
**解决**：以管理员身份运行，或将应用添加到安全软件白名单

---

## macOS 开发（仅前端）

如果只想在 macOS 上开发前端 UI：

```bash
# 安装依赖
cd OneClip-Windows
npm install

# 仅运行前端（不启动 Tauri）
npm run dev
```

访问 http://localhost:1420 预览 UI（无后端功能）

## 项目结构

```
OneClip-Windows/
├── src/                           # React 前端源码
│   ├── components/                # UI 组件
│   │   ├── TitleBar.tsx          # 标题栏（搜索、设置）
│   │   ├── MainWindow.tsx        # 主窗口容器
│   │   ├── CategoryTabs.tsx      # 分类标签
│   │   ├── ClipboardList.tsx     # 列表/网格视图
│   │   ├── ClipboardCard.tsx     # 剪贴板卡片
│   │   ├── SettingsPanel.tsx     # 设置面板
│   │   └── QuickReplyManager.tsx # 快捷回复管理
│   ├── hooks/                     # React Hooks
│   │   ├── useKeyboard.ts        # 键盘快捷键
│   │   └── useClipboardMonitor.ts # 剪贴板监控
│   ├── lib/                       # 工具库
│   │   └── tauri.ts              # Tauri API 封装
│   ├── stores/                    # Zustand 状态管理
│   │   ├── clipboardStore.ts     # 剪贴板状态
│   │   └── settingsStore.ts      # 设置状态
│   ├── styles/                    # CSS 样式
│   │   └── index.css             # TailwindCSS 入口
│   └── types/                     # TypeScript 类型
│       └── index.ts              # 类型定义
├── src-tauri/                     # Rust 后端源码
│   ├── src/
│   │   ├── main.rs               # 应用入口、托盘
│   │   ├── clipboard.rs          # 剪贴板监控
│   │   ├── database.rs           # SQLite 数据库
│   │   └── commands.rs           # Tauri 命令
│   ├── icons/                     # 应用图标
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
├── package.json                   # Node.js 依赖
├── tailwind.config.js            # TailwindCSS 配置
├── vite.config.ts                # Vite 构建配置
└── README.md
```

## 数据兼容性

Windows 版与 macOS 版使用**完全相同**的 SQLite 数据库结构：

```sql
-- 剪贴板历史表
CREATE TABLE clipboard_items (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    is_pinned INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    ...
);
```

支持：
- 📦 导入/导出数据
- ☁️ 云同步（规划中）
- 🔄 跨平台数据迁移

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `↑` / `↓` | 上下选择 |
| `Enter` | 粘贴选中项 |
| `Delete` | 删除选中项 |
| `Escape` | 关闭窗口 |
| `Ctrl+F` | 聚焦搜索框 |
| `Home` / `End` | 跳到首/尾 |
| `PageUp` / `PageDown` | 翻页 |
| `1-9` | 快速粘贴前9项 |

## 联系方式

- 📧 邮箱: vip@oneclip.cloud
- 🌐 官网: https://oneclip.cloud

## 许可证

私有软件，保留所有权利。© 2025 OneClip
