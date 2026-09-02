# 帽子的废墟图书馆编辑器 V0.2.2

## 下载
- Windows x64 单文件便携版：`HatLibraryOfRuinaEditor-0.2.2-portable.zip`（解压后运行 `帽子的废墟图书馆编辑器-0.2.2-portable.exe`）
- Linux：`HatLibraryOfRuinaEditor-0.2.2.AppImage`、`HatLibraryOfRuinaEditor-0.2.2.deb`

## 本次更新
- 新增核心书页工作区：敌人核心（EquipPage_Enemy.xml）、玩家核心（EquipPage_Librarian.xml），支持 EquipEffect 等嵌套容器字段
- 新增书页故事工作区（BookDescRoot，多语言本地化）
- 工作区新增「当前文档」选择器：按路径切换、手动导入/移除 XML/文本、记住选择
- 引擎新增 `child` 字段类型，支持 EquipEffect / TextList 等嵌套容器读写
- 战斗书页预览点击名称/能力跳转后，目标工作区列表自动滚动定位到对应条目
- 书页能力「模式」按钮（卡牌/骰子）选中高亮发光，并用琥珀金/骰子蓝区分

## 说明
- 首次打开会自动查找 Steam 与《废墟图书馆》游戏目录，也可手动选择 Mod 根目录；
- 保存操作自动备份，测试时建议使用 Mod 副本；
- 未签名，Windows SmartScreen 可能提示“仍要运行”；Linux 上运行 AppImage 可能需要先赋予执行权限。

## 反馈
请在 Issues 中附上复现步骤与涉及的文件（不要直接上传整个 Mod）。
