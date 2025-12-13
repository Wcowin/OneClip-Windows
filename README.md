<p align="center">
  <img src="https://picx.zhimg.com/80/v2-34b000e56d1af7ef61092dcd031dfd9a_1440w.webp?source=2c26e567" width="120" height="120" alt="OneClip Logo">
</p>

<h1 align="center">OneClip</h1>

<p align="center">
  <strong>智能剪贴板管理工具 - Windows 版</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#安装使用">安装使用</a> •
  <a href="#开发指南">开发指南</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#贡献指南">贡献指南</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Tauri-2.0-orange?style=flat-square" alt="Tauri">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square" alt="React">
  <img src="https://img.shields.io/badge/Rust-1.70+-dea584?style=flat-square" alt="Rust">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

---

## 功能特性

### 核心功能
- **剪贴板历史** - 自动记录复制的文本、图片、文件
- **智能分类** - 自动识别文本、图片、文件、链接、颜色
- **快捷搜索** - 快速查找历史记录 (Ctrl+F)
- **置顶收藏** - 重要内容置顶或收藏
- **快捷回复** - 保存常用文本片段

### 界面特性
- **深色/浅色模式** - 跟随系统或手动切换
- **列表/网格视图** - 自由切换显示方式
- **键盘导航** - 完整的键盘快捷键支持
- **系统托盘** - 后台运行，随时呼出

### 高级功能
- **来源应用检测** - 显示内容来自哪个应用
- **排除应用** - 指定应用的复制内容不记录
- **自动清理** - 定期清理过期记录
- **缩略图生成** - 图片自动生成缩略图
- **数据同步** - 支持通过云盘跨设备同步

## 安装使用

### 下载安装

从 [Releases](https://github.com/your-username/OneClip-Windows/releases) 页面下载最新版本：

- `OneClip_x.x.x_x64-setup.exe` - NSIS 安装包（推荐）
- `OneClip_x.x.x_x64_en-US.msi` - MSI 安装包

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+V` | 呼出/隐藏窗口 |
| `↑` / `↓` | 上下选择 |
| `Enter` | 粘贴选中项 |
| `Delete` | 删除选中项 |
| `Escape` | 关闭窗口 |
| `Ctrl+F` | 聚焦搜索框 |
| `E` | 编辑选中文本 |
| `1-9` | 快速粘贴前 9 项 |

## 开发指南

### 环境要求

- **Node.js** 18+
- **Rust** 1.70+
- **Visual Studio Build Tools** 2022（含 C++ 桌面开发工作负载）
- **WebView2**（Windows 10 需要安装，Windows 11 已内置）

### 安装开发环境

#### 1. 安装 Rust
```powershell
winget install Rustlang.Rust.MSVC
```

#### 2. 安装 Node.js
```powershell
winget install OpenJS.NodeJS.LTS
```

#### 3. 安装 Visual Studio Build Tools
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```
安装后打开 Visual Studio Installer，选择 **"使用 C++ 的桌面开发"** 工作负载。

#### 4. 安装 WebView2（Windows 10）
```powershell
winget install Microsoft.EdgeWebView2Runtime
```

### 运行项目

```bash
# 克隆项目
git clone https://github.com/your-username/OneClip-Windows.git
cd OneClip-Windows

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建发布版本
npm run tauri build
```

### 项目结构

```
OneClip-Windows/
├── src/                      # React 前端
│   ├── components/           # UI 组件
│   ├── hooks/                # React Hooks
│   ├── lib/                  # 工具库 (Tauri API 封装)
│   ├── stores/               # Zustand 状态管理
│   ├── styles/               # 样式文件
│   └── types/                # TypeScript 类型
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── main.rs           # 应用入口
│   │   ├── clipboard.rs      # 剪贴板监控
│   │   ├── database.rs       # SQLite 数据库
│   │   ├── commands.rs       # Tauri 命令
│   │   ├── paste.rs          # 粘贴功能
│   │   └── sync.rs           # 数据同步
│   ├── icons/                # 应用图标
│   └── tauri.conf.json       # Tauri 配置
├── public/                   # 静态资源
├── package.json
└── README.md
```

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 | 组件化 UI |
| 类型系统 | TypeScript | 类型安全 |
| 样式 | TailwindCSS | 原子化 CSS |
| 状态管理 | Zustand | 轻量级状态管理 |
| 图标 | Lucide React | 现代图标库 |
| 后端 | Rust + Tauri 2.0 | 高性能原生应用 |
| 数据库 | SQLite (rusqlite) | 本地数据存储 |
| 键盘模拟 | enigo | 粘贴功能 |

## 数据兼容性

OneClip Windows 版与 macOS 版使用相同的数据库结构，支持：

- 通过云盘（OneDrive、iCloud 等）同步数据
- 跨平台数据迁移
- 导入/导出数据

## 常见问题

<details>
<summary><b>编译报错 "linker 'link.exe' not found"</b></summary>

未安装 Visual Studio Build Tools。安装后选择 "C++ 桌面开发" 工作负载。
</details>

<details>
<summary><b>运行时白屏</b></summary>

WebView2 未安装。运行 `winget install Microsoft.EdgeWebView2Runtime`。
</details>

<details>
<summary><b>剪贴板监控不工作</b></summary>

可能被安全软件拦截，尝试以管理员身份运行或添加到白名单。
</details>

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 联系方式

- 邮箱: vip@oneclip.cloud
- 官网: https://oneclip.cloud

---

<p align="center">
  Made with ❤️ by <a href="https://oneclip.cloud">OneClip Team</a>
</p>
