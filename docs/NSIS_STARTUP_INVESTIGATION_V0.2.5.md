# V0.2.5 Windows 便携启动调查

日期：2026-11-01。报告针对截图中的 `NSIS Error: Error writing temporary file. Make sure your temp folder is valid.`。

## 结论

本机已在受限 Windows 令牌下复现完全相同的报错。临时路径无效或拒绝写入，并且 Windows 备用临时目录也不能写入时，V0.2.4 的 NSIS 启动器无法进入应用启动阶段。完整解压版 ZIP 在同一测试条件下可启动并完成页面与版本检查。

尚未取得受影响机器的 Windows 版本、账号路径、TEMP/TMP、目录权限及磁盘状态，因此这只是已验证的一条失败路径，不能据此确定对方机器的具体诱因。没有证据证明中文用户名是原因；本机中文、日文、重音字母和空格路径测试通过。没有创建新的 Windows 账号，也没有验证其他机器或 Windows 版本。

## 代码与配置依据

- 基线提交：`882f77d598000decd07d7391f8946d43de8225a3`，V0.2.4，Electron 36.0.0，electron-builder 25.1.8，本机 NSIS 缓存版本 3.0.4.1。
- 本机 `app-builder-lib/out/targets/nsis/NsisTarget.js`：Unicode 默认开启，执行级别默认 `user`。旧版本没有禁用 Unicode。
- 本机 `templates/nsis/portable.nsi`：应用解压到 `$TEMP` 下构建时生成的目录，或 `$PLUGINSDIR/app`，运行后清理。旧 ZIP 仅包含这个单文件 EXE，仍会经过 NSIS。
- [NSIS 启动源码](https://github.com/kichik/nsis/blob/v303/Source/exehead/Main.c) 在加载脚本头之前检查临时目录并尝试备用目录；[官方 portable 配置说明](https://www.electron.build/docs/api/app-builder-lib.interface.portableoptions/) 中的 `unpackDirName` 也仍位于临时目录体系。更改应用解压子目录不能可靠消除更早的启动器临时文件初始化失败。
- 最新在线 electron-builder 文档可能与 25.1.8 有差异，本次实现以安装的 25.1.8 源码与 schema 为准，未升级打包工具。

## 修复

新增 electron-builder 原生 `zip` 目标，产物命名为 `HatLibraryOfRuinaEditor-0.2.5-win-x64.zip`。ZIP 内包含 Electron 应用 EXE、resources/app.asar、locales、DLL 等全部运行文件，完整解压后直接启动。保留原单文件版；显式写出 Unicode 和普通用户执行级别只是固定已有行为，不宣称单文件版已经不依赖 TEMP。

这项修复不修改系统环境变量、系统目录权限、杀毒设置或编辑器 UI。编辑器自身仍需访问用户配置目录与 Mod 文件。

## 测试方法与结果

系统：Windows NT 10.0.26200.0，x64。每次测试创建独立的临时目录和含中文、空格的用户配置目录；只给测试进程传入 TEMP/TMP 和 `--user-data-dir`。不可写测试只给新建测试文件夹设置拒绝写入 ACL，并在 finally 中恢复，不改变真实用户或系统 TEMP。

| TEMP/TMP 条件 | V0.2.4 单文件，正常用户令牌 | V0.2.4 单文件，受限令牌 | V0.2.5 完整 ZIP，正常用户令牌 | V0.2.5 完整 ZIP，受限令牌 |
| --- | --- | --- | --- | --- |
| 存在、可写 | 通过 | 通过 | 通过 | 通过 |
| 中文/日文/é/空格，可写 | 通过 | 通过 | 通过 | 通过 |
| 多级父目录缺失 | 通过（有备用目录） | 相同 NSIS 报错 | 通过 | 通过 |
| 路径实际是普通文件 | 通过（有备用目录） | 相同 NSIS 报错 | 通过 | 通过 |
| ACL 拒绝写入 | 通过（有备用目录） | 相同 NSIS 报错 | 通过 | 通过 |

正常用户令牌测试保持 Chromium 默认沙箱和 GPU 参数。Codex 受限令牌不兼容 Chromium 的嵌套沙箱，初次基线运行以 `0x80000003` 退出；之后所有受限令牌对照统一使用仅供测试的 `--no-sandbox --disable-gpu`。这两个参数没有写入发布包或普通用户启动流程。NSIS 报错在 Chromium 启动之前发生。

ZIP 测试对象为最终 ZIP 实际解压到“兼容包 中文空格 0.2.5”目录中的 EXE，而非开发服务器。成功条件包括进程正常退出、无页面错误、生成新页面文本并包含 `V0.2.5`。

其他验证：

- `pnpm typecheck` 通过。
- `pnpm test`：9 个测试文件、89 项测试通过。
- `Test-WindowsArchive.ps1`：ZIP 中关键应用文件齐全，SHA-256 与 win-unpacked 对应文件一致；此检查已加入 Windows 发布 CI，防止再次误发仅套壳的 ZIP。
- `Test-PortableRelease.ps1`：最终 ZIP 的工作区与关键词编辑、XML 保存回读通过；测试配置已隔离到项目测试目录，不依赖开发者真实配置目录的写入权限。
- V0.2.5 单文件版完成启动、版本及关键词界面回归。此包保留 NSIS，因此仍不作为临时目录故障的解决包。

复现命令（PowerShell 7，项目根目录）：

```powershell
pwsh -File tools/Test-StartupCompatibility.ps1 -Executable 'apps/desktop/release/帽子的废墟图书馆编辑器-0.2.4-portable.exe' -Version 0.2.4 -Label old-nsis
pwsh -File tools/Test-StartupCompatibility.ps1 -Executable 'docs/verification/兼容包 中文空格 0.2.5/帽子的废墟图书馆编辑器.exe' -Version 0.2.5 -Label zip -RequireAllPass
pwsh -File tools/Test-WindowsArchive.ps1 -Version 0.2.5
```

受限令牌测试需显式增加 `-DisableSandboxForRestrictedToken`。原始结果、截图及 stderr 保留在本机 `docs/verification/startup-*/`，该目录按项目既有规则不提交。

## 给受影响用户的操作

下载 `win-x64.zip`，完整解压后运行里面的应用 EXE。不要只复制 EXE，不要在 ZIP 预览中直接运行，也不要使用旧的 `portable.zip` 代替。如果仍然失败，收集新的完整报错、Windows 版本、EXE 路径以及用户配置目录访问情况，再继续定位。
