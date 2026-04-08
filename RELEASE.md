# OneClip Windows 发布与内置更新（GitHub Releases）

这个文档用于把 Windows 版本从“可开发”推进到“可发布 + 应用内更新可用”。

## 1. 发布前准备

1. 确认版本号一致：
   - `package.json` 的 `version`
   - `src-tauri/Cargo.toml` 的 `version`
   - `src-tauri/tauri.conf.json` 的 `version`
2. 确认关键功能已回归：
   - 主窗口快捷键
   - 独立快速粘贴面板快捷键
   - 剪贴板监控/排除应用
   - 数据同步（连接 Mac 数据目录）
3. 清理本地脏数据（可选）：
   - 删除测试产生的临时目录/测试数据库
4. 确认构建环境：
   - Node.js / npm
   - Rust
   - Visual Studio Build Tools（Windows）

## 2. 一次性配置：Updater 密钥

必须先生成并配置签名密钥（只做一次）：

```powershell
cargo tauri signer generate -w ~/.tauri/oneclip.key
```

会得到：

1. 私钥文件（示例：`~/.tauri/oneclip.key`）  
   - 仅在 CI/发布机保存，不要提交到仓库。
2. 公钥字符串  
   - 填入 `src-tauri/tauri.conf.json` 的：
   - `plugins.updater.pubkey`

当前仓库里该字段还是占位符：`REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY`，发布前必须替换。

## 3. GitHub Actions 自动发布（推荐）

仓库已提供自动发布工作流：

- `.github/workflows/release.yml`
- 触发方式：push `v*` tag（例如 `v1.0.1`）

先在 GitHub 仓库 Settings → Secrets and variables → Actions 配置：

1. `TAURI_UPDATER_PUBLIC_KEY`：上一步生成的公钥字符串
2. `TAURI_SIGNING_PRIVATE_KEY`：私钥内容（文本）
3. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：私钥密码

工作流会自动完成：

1. 校验 tag 版本与 `package.json` / `tauri.conf.json` 一致
2. 注入 updater 公钥
3. 构建 Windows 安装包
4. 生成 `latest.json`
5. 上传安装包、`.sig`、`latest.json` 到 GitHub Release

触发命令示例：

```bash
git tag v1.0.1
git push origin v1.0.1
```

## 4. 构建安装包

在项目根目录执行：

```powershell
npm install
npm run tauri:build
```

产物路径（示例）：

- `src-tauri/target/release/bundle/nsis/OneClip_*.exe`
- `src-tauri/target/release/bundle/msi/OneClip_*.msi`
- 同目录下对应的签名文件 `*.sig`（由 updater 构建产物生成）

## 5. 生成 latest.json（给应用内更新读取）

应用从下面 URL 拉取元数据：

- `https://github.com/Wcowin/OneClip-Windows/releases/latest/download/latest.json`

生成 `latest.json`（示例使用 NSIS 包）：

```powershell
npm run release:latestjson:win -- `
  --version 1.0.1 `
  --url https://github.com/Wcowin/OneClip-Windows/releases/download/v1.0.1/OneClip_1.0.1_x64-setup.exe `
  --signature-file .\src-tauri\target\release\bundle\nsis\OneClip_1.0.1_x64-setup.exe.sig `
  --notes-file .\release-notes.txt `
  --output .\latest.json
```

说明：

1. `--url` 必须是 Release 里可直接下载的安装包地址。
2. `--signature-file` 必须匹配该安装包的 `.sig` 文件。
3. `platform` 默认是 `windows-x86_64`，如需 ARM 版本可传 `--platform windows-aarch64`。

## 6. 上传 GitHub Release 资产

发布时至少上传以下文件：

1. `OneClip_*.exe`（NSIS，推荐给普通用户）
2. `OneClip_*.msi`（企业环境常用）
3. 对应 `*.sig`（签名文件）
4. `latest.json`（放到该 Release 资产）
5. 更新说明（Release Notes）

只要 `latest.json` 与安装包、签名一致，客户端“检查更新/下载并安装更新”就可用。

## 7. Windows 实机验收（必须）

使用 `scripts/windows-release-smoke.ps1`：

```powershell
pwsh -File .\scripts\windows-release-smoke.ps1
```

脚本会：

1. 检查 Node/Rust 工具链
2. 执行前端构建与 Rust 检查
3. 执行 Tauri 打包（`msi + nsis`）
4. 输出安装包路径

手工验收项（至少跑一轮）：

1. 首次安装：可正常启动、托盘存在
2. 主窗口快捷键：显示/隐藏正常
3. 快速粘贴快捷键：独立面板显示/隐藏、键盘交互正常
4. 设置中修改两个快捷键后无需重启即可生效
5. 复制文本/图片后入库，重启后仍存在
6. 指向 Mac 同步目录后能 `sync_now` 拉取数据
7. 在“关于”页点击“检查更新”能看到新版
8. 点击“下载并安装更新”后能完成安装并升级
