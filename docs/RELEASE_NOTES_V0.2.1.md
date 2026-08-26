# 帽子的废墟图书馆编辑器 V0.2.1

## 下载
- Windows x64 单文件便携版：`HatLibraryOfRuinaEditor-0.2.1-portable.zip`（解压后运行 `帽子的废墟图书馆编辑器-0.2.1-portable.exe`）
- Linux：`HatLibraryOfRuinaEditor-0.2.1.AppImage`、`HatLibraryOfRuinaEditor-0.2.1.deb`

## 本次更新
- 战斗书页能力编辑新增“模式”切换：卡牌能力（独立）/ 骰子能力（连续），Desc 自动在单行与多行间转换
- 书页能力列表新增本地化渲染视图，能力描述以正则预览展示
- 被动互斥类型编辑优化：新增被动ID / ModID 字段，修正开关与写入逻辑
- 被动 schema 过滤 `UseCustomInnerType`
- 补充中 / 英 / 日三语界面文案

## 说明
- 首次打开会自动查找 Steam 与《废墟图书馆》游戏目录，也可手动选择 Mod 根目录；
- 保存操作自动备份，测试时建议使用 Mod 副本；
- 未签名，Windows SmartScreen 可能提示“仍要运行”；Linux 上运行 AppImage 可能需要先赋予执行权限。

## 反馈
请在 Issues 中附上复现步骤与涉及的文件（不要直接上传整个 Mod）。