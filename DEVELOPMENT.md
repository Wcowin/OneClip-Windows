# OneClip Windows 本地开发指南

本指南帮助你在 Windows 机器上搭建开发环境、调试和构建 OneClip。

## 目录

- [环境准备](#环境准备)
- [获取代码](#获取代码)
- [安装依赖](#安装依赖)
- [开发调试](#开发调试)
- [构建发布](#构建发布)
- [常见问题](#常见问题)

---

## 环境准备

### 1. 安装 Rust

打开 PowerShell（管理员），运行：

```powershell
winget install Rustlang.Rust.MSVC
```

或者从官网下载：https://rustup.rs/

安装完成后，**重启 PowerShell**，验证：

```powershell
rustc --version
# 应显示: rustc 1.xx.x

cargo --version
# 应显示: cargo 1.xx.x
```

### 2. 安装 Node.js

```powershell
winget install OpenJS.NodeJS.LTS
```

或者从官网下载：https://nodejs.org/

验证：

```powershell
node --version
# 应显示: v20.x.x 或更高

npm --version
# 应显示: 10.x.x 或更高
```

### 3. 安装 Visual Studio Build Tools

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

安装完成后：

1. 打开 **Visual Studio Installer**
2. 点击 **修改**
3. 勾选 **"使用 C++ 的桌面开发"** 工作负载
4. 确保右侧勾选了 **Windows 10/11 SDK**
5. 点击 **安装**

### 4. 安装 WebView2（Windows 10 需要）

Windows 11 已内置，Windows 10 运行：

```powershell
winget install Microsoft.EdgeWebView2Runtime
```

### 5. 验证环境

重启 PowerShell，运行以下命令确认所有工具已安装：

```powershell
rustc --version
cargo --version
node --version
npm --version
```

---

## 获取代码

### 方式 1：Git 克隆

```powershell
git clone https://github.com/Wcowin/OneClip-Windows.git
cd OneClip-Windows
```

### 方式 2：下载 ZIP

1. 访问 https://github.com/Wcowin/OneClip-Windows
2. 点击 **Code** → **Download ZIP**
3. 解压到你想要的目录，例如 `C:\Projects\OneClip-Windows`

---

## 安装依赖

进入项目目录：

```powershell
cd C:\Projects\OneClip-Windows  # 根据你的实际路径修改
```

安装前端依赖：

```powershell
npm install
```

首次运行会自动安装 Rust 依赖（需要几分钟）。

---

## 开发调试

### 启动开发模式

```powershell
npm run tauri:dev
```

这会：
1. 启动 Vite 开发服务器（前端热重载）
2. 编译 Rust 代码（首次需要 3-5 分钟）
3. 启动应用窗口

### 开发模式特点

- **前端热重载**：修改 React 代码后自动刷新
- **Rust 重新编译**：修改 Rust 代码后需要重启
- **控制台日志**：可以在终端看到 Rust 的 `log::info!` 输出
- **DevTools**：按 `F12` 或右键 → 检查，打开开发者工具

### 查看日志

开发模式下，日志会输出到终端：

```
[INFO] 剪贴板监控已启动
[INFO] 全局快捷键已注册: Ctrl+Shift+V
[INFO] OneClip Windows 启动成功
```

### 调试前端

1. 应用运行时按 `F12` 打开 DevTools
2. 可以查看 Console、Network、Elements 等
3. React 组件可以用 React DevTools 扩展调试

### 调试 Rust

在 `src-tauri/src/` 中添加日志：

```rust
log::info!("变量值: {:?}", some_variable);
log::error!("出错了: {}", error_message);
```

日志会显示在运行 `npm run tauri:dev` 的终端中。

---

## 构建发布

### 构建发布版本

```powershell
npm run tauri:build
```

构建需要 5-10 分钟，完成后输出：

```
src-tauri/target/release/
├── oneclip-windows.exe          # 可执行文件（未打包）
└── bundle/
    ├── nsis/
    │   └── OneClip_1.0.0_x64-setup.exe   # NSIS 安装包
    └── msi/
        └── OneClip_1.0.0_x64_en-US.msi   # MSI 安装包
```

### 测试安装包

1. 双击 `OneClip_1.0.0_x64-setup.exe` 安装
2. 或者直接运行 `oneclip-windows.exe` 测试（无需安装）

### 构建选项

```powershell
# 仅构建，不打包安装程序
npm run tauri:build -- --no-bundle

# 构建调试版本（更快，有调试信息）
npm run tauri:build -- --debug

# 指定打包格式
npm run tauri:build -- --bundles nsis
npm run tauri:build -- --bundles msi
```

---

## 常见问题

### Q1: `npm run tauri:dev` 报错 "linker 'link.exe' not found"

**原因**：Visual Studio Build Tools 未正确安装

**解决**：
1. 打开 Visual Studio Installer
2. 确保安装了 "使用 C++ 的桌面开发" 工作负载
3. 重启 PowerShell

### Q2: 编译时报错 "failed to run custom build command"

**原因**：Rust 工具链问题

**解决**：
```powershell
rustup update
rustup target add x86_64-pc-windows-msvc
```

### Q3: 应用启动后白屏

**原因**：WebView2 未安装

**解决**：
```powershell
winget install Microsoft.EdgeWebView2Runtime
```

### Q4: 剪贴板监控不工作

**可能原因**：
1. 安全软件拦截
2. 需要管理员权限

**解决**：
1. 将应用添加到安全软件白名单
2. 右键 → 以管理员身份运行

### Q5: 全局快捷键不响应

**可能原因**：快捷键被其他应用占用

**解决**：
1. 检查是否有其他应用使用了相同快捷键
2. 在设置页修改主窗口快捷键或快速粘贴快捷键

### Q6: 构建的 exe 无法运行

**可能原因**：
1. 缺少 VC++ 运行时
2. Windows Defender 拦截

**解决**：
1. 安装 [VC++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
2. 在 Windows 安全中心添加排除项

### Q7: 如何清理构建缓存？

```powershell
# 清理 Rust 构建缓存
cd src-tauri
cargo clean

# 清理 npm 缓存
cd ..
rm -r node_modules
npm install
```

---

## 开发工作流建议

### 日常开发

1. 启动开发模式：`npm run tauri:dev`
2. 修改代码，查看效果
3. 前端改动自动热重载
4. Rust 改动需要重启

### 测试构建

1. 构建：`npm run tauri:build`
2. 测试 `src-tauri/target/release/oneclip-windows.exe`
3. 确认功能正常

### 发布版本

1. 更新版本号：
   - `package.json` 中的 `version`
   - `src-tauri/Cargo.toml` 中的 `version`
   - `src-tauri/tauri.conf.json` 中的 `version`
2. 构建：`npm run tauri:build`
3. 生成 updater 元数据（`latest.json`）并准备 `.sig`
4. 测试安装包和应用内更新
5. 发布到 GitHub Releases（安装包 + `.sig` + `latest.json`）

详细流程见 `RELEASE.md`。

---

## 有用的命令

```powershell
# 开发模式
npm run tauri:dev

# 构建发布版
npm run tauri:build

# 生成 updater latest.json（需要带参数）
npm run release:latestjson:win -- --help

# 仅构建前端
npm run build

# 检查 TypeScript
npx tsc --noEmit

# 检查 Rust
cd src-tauri && cargo check

# 更新依赖
npm update
cd src-tauri && cargo update
```

---

## 联系方式

遇到问题？

- 提交 Issue: https://github.com/Wcowin/OneClip-Windows/issues
- 邮箱: vip@oneclip.cloud
