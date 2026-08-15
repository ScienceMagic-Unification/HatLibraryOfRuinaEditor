# 帽子的废墟图书馆编辑器 V0.1.2

## 下载
- Windows x64 单文件便携版：`HatLibraryOfRuinaEditor-0.1.2-portable.zip`（解压后运行 `帽子的废墟图书馆编辑器-0.1.2-portable.exe`）
- Linux：`HatLibraryOfRuinaEditor-0.1.2.AppImage`、`HatLibraryOfRuinaEditor-0.1.2.deb`

## 本次更新
- 适配 Linux：Steam 目录发现、跨平台路径拼接、AppImage / deb 打包与 GitHub Actions 自动构建
- 战斗书页列表新增“本地化”开关，可切换显示本地化名称
- 修复含盘符 / 绝对路径的文件加载

## 说明
- 首次打开会自动查找 Steam 与《废墟图书馆》游戏目录，也可手动选择 Mod 根目录；
- 当前主要开放：战斗书页 / 书页名称 / 书页能力三个工作区；
- 保存操作自动备份，测试时建议使用 Mod 副本；
- 未签名，Windows SmartScreen 可能提示“仍要运行”；Linux 上运行 AppImage 可能需要先赋予执行权限。

## 已知范围
- 图片大工作区尚未实装（计划见 `docs/图片工作区计划.md`）；
- 更多 XML 工作区将在后续版本开放。

## 反馈
请在 Issues 中附上复现步骤与涉及的文件（不要直接上传整个 Mod）。