# 核心书页字段核对

核对日期：2026-10-06。只读反编译游戏 `LibraryOfRuina_Data/Managed/Assembly-CSharp.dll`，未加载或执行游戏程序集。

SHA256：`E450EF9DD29ABF5828491A891D86515D4AF35C21C81D8E076335B86F6231C901`。

使用本机 dnSpy Console 的 `-t` / `--md` 提取目标类型与方法；提取结果在 `verification/core-pages/`。编辑器只提供 XML 基础数据预览，不模拟战斗回调。

| 核对对象 | 游戏定义/行为 | 编辑器处理 |
|---|---|---|
| BookOption | None、Basic、MultiDeck | 移除战斗书页 Option 候选；已有扩展值不主动删除 |
| AtkResist / BookModel.GetResistRate (0600412A) | Weak=2、Vulnerable=1.5、Normal=1、Endure=0.5、Resist=0.25、Immune=0，默认分支=1 | 修正致命/脆弱映射，补齐抗性，显示实际倍率 |
| BookModel.SetOriginalSpeedNum (06004119) | 从 BookXmlInfo.speedDiceNumber 读取 | 顶层 Book/SpeedDiceNum 为主要字段，EquipEffect 内同名字段放高级区，分别写入 |
| BookModel.GetStartDraw | 3 + AddedStartDraw | 字段命名为额外初始抽牌，预览显示合计 |
| BookEquipEffect / CustomInvitation.BookEquipEffect | MaxPlayPoint、StartPlayPoint 初值均为 3 | 新建书页使用 3；不覆盖现有值 |
| CustomInvitation.BookEquipEffect | Hp、Break、SpeedMin、SpeedMax 初值均为 1 | 新建 Mod 核心采用这些明确初值；全局 BookEquipEffect 的对应字段默认 0，预览缺省按全局类型回退 |
| BookXmlInfo | TextId=-1、Episode=-1、RandomFace=false、SpeedDiceNum=1、SuccessionPossibleNumber=9 | 允许保留/修改 TextId 与负数 Episode，不再锁死 TextId |
| BookXmlInfo.CharacterSkin / categoryList | 重复 XmlElement 列表 | 按列表编辑，不折叠为单字符串 |
| LorIdXml / LorId.MakeLorId | Pid 空值使用宿主包，@origin 使用原版，其余为指定包 | 被动保留自定义 Pid，逐条修改仅影响指定属性 |
| BookSoulCardInfo / BookModel.CreateSoulCard | Card 带 Level、Emotion 属性；按 emotionLevel 查找对应卡牌 | 独立引用行编辑，保留两属性 |
| BookXmlInfo.Name / Desc | Mod Name 使用 InnerName；Mod 故事按自身 LorId 查找 | 原始 Name 作为主名称；当前 Mod 的故事按所选文档 BookID 关联，显示独立故事名 |

`CustomOnlyCard` 未出现在原版上述两个 BookEquipEffect 类型中，保留为扩展字段，不宣称原版直接支持。未知节点/属性继续由保序 XML 文档保存，可在源码视图编辑。

## 数据流修复

- 核心文件须同时满足 `BookXmlRoot` 和敌我命名规则；同一侧分拆文件归并到当前文档选择器。
- `selectPrimaryDocument` 统一显示与写入目标：显式“无”优先，其次精确文件路径，再语言与后备文档。此前 editData 忽略 primaryDocPath，会写入同语言的另一份文件。
- 被动修改不再重建整个列表，保留 Pid、未来属性、其他 EquipEffect 子节点；新增行使用可编辑的 0，不过滤用户正在输入的空值。
- 移除原扫描中无法增加结果的第三遍本地化读取；列表搜索不再使用被截断的显示名称。

## 验证边界

单元测试覆盖字段枚举/默认值、根与效果内速度分离、重复皮肤、被动新增与属性保留、速度顺序提示、文档选择。隐藏 Electron 测试覆盖两个敌我工作区、分拆文件、同 ID 跨文档切换、保存、撤销/重做、故事语言、源码/表单切换。未在游戏内运行战斗。
