纯AI仓库

# 废墟图书馆 XML 编辑器（原型 v0.1）

为《废墟图书馆》(Library of Ruina) Mod 开发打造的可视化 XML 编辑器。
目前已实现可运行的桌面端雏形：自动发现 Steam/游戏/Mod → 按模块打开 XML → 数据区 / 编辑区 / 本地化区 / 预览区 / 专属正则统一工作流。

## 技术栈（均使用成熟开源库，不自造轮子）

- 桌面壳：Electron 36 + electron-vite 3
- 前端：React 19 + TypeScript + Vite 6
- 设计系统：Tailwind CSS + Radix UI（Select/Tabs）+ lucide-react
- 状态：zustand（+ SnapshotHistory 撤销/重做）
- XML：fast-xml-parser（preserveOrder，保留注释/属性/空标签）
- 测试：Vitest（核心引擎）；后续 UI 测试用已安装的 `playwright` 技能

## 目录结构（pnpm monorepo，模块化复用）

```
apps/desktop             Electron 桌面应用（main / preload / renderer）
packages/editor-core     XML 引擎：解析/序列化、实体读写、校验、正则、撤销
packages/schemas         模块注册表：CardInfo / Passive / Enemy 的纯配置
packages/ui              统一设计系统组件（Button/Input/Select/Badge/Tabs…）
docs/preview/prototype.png  界面验收截图
开发计划.md               完整计划（通俗版）
```

## 快速开始

```bash
pnpm install      # 安装依赖（首次需放行 electron/esbuild 构建脚本）
pnpm dev          # 开发模式启动
pnpm build        # 生产构建
pnpm test         # 核心引擎单元测试（11 项）
pnpm typecheck    # 全包类型检查
```

## 无界面自动验收（开发辅助）

主进程支持以下环境变量：启动后自动截图 / 抓取页面文本 / 执行脚本后退出：

```powershell
$env:RUINA_SCREENSHOT='out.png'
$env:RUINA_SCREENSHOT_DELAY='3000'
$env:RUINA_EXEC_JS='(() => { document.querySelectorAll("aside button")[1].click(); return "ok"; })()'
$env:RUINA_DUMP_TEXT='ui.txt'
& apps/desktop/node_modules/.bin/electron.CMD apps/desktop
```

## 已实现并验收

- Steam 注册表 + libraryfolders.vdf 游戏路径发现，自动列出所有 Mod
- CardInfo 数据区：118 张卡虚拟滚动列表、搜索、稀有度徽标
- 编辑区：Schema 驱动表单（枚举下拉、属性组、骰子行为表格、多选 chips、标记开关）
- 本地化区：按 ID 自动关联 cn/en BattlesCards，双向编辑 + “从数据区同步名称”
- 预览区：卡图资源解析 + 当前实体原始 XML 预览
- 专属正则：按模块规则库，文件/选中记录/字段三种作用域，预览命中 + 可撤销替换
- 安全保存：备份到 userData/backups → 临时文件 → 原子替换
- 校验：必填、整数、枚举、唯一 ID（真实数据中 Passive 的 8 个问题已自动发现）
- 模块批发：Passive、Enemy 仅靠 Schema 配置接入，互不影响（已实测）

## 如何新增一种 XML（批发）

1. 在 `packages/schemas/src/` 新建模块文件，声明数据文件、根节点、实体、字段、可选本地化/预览/正则；
2. 在 `packages/schemas/src/index.ts` 的 `modules` 数组注册；
3. 无需修改引擎与 UI，即获得完整工作区。

## 下一步（见 开发计划.md）

阶段 4：补齐其余 XML 类型与高级功能（跨文件引用、模板、本地化同步增强）；
阶段 5：Vitest 全量测试 + Playwright Electron 冒烟测试与视觉走查；
阶段 6：安全评审（security-best-practices 技能）+ electron-builder 打包。
### 本阶段 UI 升级
- 三模式工作区：简易（必要字段轻编辑）/ 详细（全字段表单）/ 源码（XML 可直接编辑并应用）
- 保存分级：工具栏“保存本模块”与顶栏“全部保存”；撤销/重做支持 Ctrl+Z / Ctrl+Y
- 列表按稀有度着色名称；预览区模拟游戏内卡牌（费用/射程/骰子/能力）
- 新增“卡牌能力 BattleCardAbilities”工作区（264 条能力，中英文联动）
### 自适应扫描架构（最新）
- 打开 Mod 后自动读取 Data 下与 Assemblies/Localize 下的全部 XML
- 按根节点名把每个文件分配到对应工作区：已注册模板用预设 Schema，未知根节点自动推断字段生成通用工作区（不遗漏任何文件）
- 同一文件可被多个工作区共享（如卡牌名称同时出现在 CardInfo 的本地化区），编辑与保存自动同步
- 多语言判别：先按文件/目录名（cn、en、jp、ko…），识别不到再按正文中文/拉丁字符比例推断
- 本地化驱动的工作区（卡牌名称、卡牌能力）在工具栏提供语言切换
- 底部状态条已整体移除
### CardInfo 详细区精细化
- 移除文本 ID 输入（固定 TextId=-1，新建卡牌自动写入）
- 名称与本地化名称并排编辑，实时同步写回卡牌名称工作区
- ID 行右侧放费用与情感等级限制，且仅允许输入数字
- 字段顺序：名称 → 卡牌能力 → 稀有度 → 射程（带图标单选）→ 目标（单体/全体）
- 射程图标来自项目 `内置资源/` 文件夹并打包进编辑器（FarArea 与 FarAreaEach 共用群体攻击图）
### 预览区与正则精简
- 所有工作区移除正则 UI；非预览工作区右侧只保留本地化区
- CardInfo：卡图资源移到卡牌能力上方；预览顺序为 费用 → 本地化名称（稀有度用字体颜色表示）→ 射程图标
- 卡牌能力框直接显示能力 ID 对应的中文能力描述；每个骰子显示 骰子图标 + 最小值~最大值（Atk #FF430A / Def #03BBFF / Standby #d3b14b）+ 骰子能力描述
- 预览中的本地化名称 / 能力文本可点击，直接跳转到卡牌名称 / 卡牌能力工作区的对应词条
### 特性 / 目标 / 主题色 / ID 切换
- 特性与关键词移到目标下方；特性枚举：Basic/OnlyPage/EGO/EgoPersonal/Personal/NoInventory/ExhaustOnUse/EgoChange（对应中文标签）
- 目标枚举：One 单体 / Team 敌方全体 / All 所有角色 / Passive 被动指定 / TeamNear 每个敌方群体
- 单选框选中色跟随稀有度颜色；特性含 EGO 时全局使用 #C61231
- 射程/目标/稀有度/特性标题右侧提供“ID”小按钮，可切换显示真实 XML 值
- 稀有度单选按钮前增加对应稀有度颜色圆点
### 卡牌名称工作区与预览交互
- ID 切换按钮改为明显可点击的胶囊按钮，激活颜色跟随稀有度主题色；射程/目标也补上了该按钮
- 目标 TeamNear 显示为“每个敌方目标”
- 预览区不再显示卡图文件名；本地化内容整块区域可点击跳转，无下划线/弹框提示
- 卡牌名称列表按 CardInfo 稀有度着色，找不到对应卡牌显示白色
- 卡牌名称工作区右侧为功能按钮区：一键同步全部名称（缺条自动新建）、一键删除孤儿条目；并移除卡牌描述窗口
### 章节 / 优先级 / 默认值精细化
- 章节改为带图标的单选框：1传闻 / 2都市怪谈 / 3都市传说 / 4都市恶疾 / 5都市梦魇 / 6都市之星 / 7杂质 + 自定义（仅数字输入框）；无 ID 切换按钮
- 优先级拆为短输入框（优先级，纯数字）+ 长输入框（优先级脚本）；新建默认 Priority=1、PriorityScript 为空元素
- 移除类别输入，固定 Category=None
- 最大数量短输入框，空值提示 150，新建默认 150
- E.G.O 冷却仅在特性含 EGO 时显示，空值提示 9；勾选 EGO 特性自动写入 9，非 EGO 卡不生成该字段
### 帽子奇点 / 未保存提醒 / 骰子与皮肤
- 左上角新增“开启帽子奇点”高亮按钮，状态持久化到下次启动（功能待实装）
- 有未保存修改时关闭窗口会弹出二次确认
- 骰子行为更名“骰子列表”，添加骰子按钮；未开启奇点最多 5 个骰子
- 骰子字段：最小值 / 最大值 / 类型 / 属性 / 动作（26 个 Motion 枚举）/ 特效资源 / 骰子能力 / 动作脚本，输入框与下拉框均已实装
- 最大数量下方新增“皮肤切换”：勾选后显示 皮肤名称 / 切换类型（EGO 默认、Normal）/ 皮肤身高（默认 0）
### 校验修正与字段清理
- 最大数量为空时不写入 XML
- 皮肤切换关闭时，皮肤名称 / 切换类型 / 皮肤身高均不写入 XML
- 移除特殊效果 UI，加载与校验时自动剥离所有 SpecialEffect
- 帽子奇点按钮带 Atom 图标
- 保存本模块左侧新增“校验修正”按钮：按 XML 规则 + 卡牌信息特殊规则（TextId=-1、Category=None、Spec 默认、EGO 冷却规则、去重 ID）校验并修复整个工作区
### 地图切换 / 侧栏分组 / 自适应归类
- 勾选地图切换才写入 MapChange，并显示“地图名称（XML ID）”输入框
- 侧栏划分“卡牌-右下连接”（战斗书页/卡牌名称/卡牌能力）与“其他工作区”
- 卡牌名称的一键同步改为写入当前选中的本地化文档（可在 cn/en 间切换）
- 切换 Mod 时重新扫描全部 XML：先按根节点归类，再按文件名兜底（CardInfo→cardinfo、BattleCards→cardname、BattleCardAbilities→cardability 等），并把根节点替换为实际根
- 同一工作区多个 XML 文档时，工具栏“文档”选择器可切换
### 侧栏连线图与本地化兼容
- 侧栏改为“卡牌”节点向右连线到 战斗书页 / 卡牌名称 / 卡牌能力 三个工作区（可点击切换）；其他工作区暂隐藏
- 本地化扫描同时兼容 `.xml` 与 `.txt`（TianShi 的本地化文件为 .txt 扩展名、内容为 XML）
- 自动归类支持按文件名兜底（BattleCards→卡牌名称、BattleCardAbilities→卡牌能力等），并把模板根节点替换为实际根节点
### 书页名称 / 书页能力
- 连线图节点更名为“书页”，工作区更名为 书页名称 / 书页能力
- 书页能力列表仅显示 ID，列表宽度随 ID 长度动态调整；ID 输入框长度大幅增加
- 能力 Desc 支持读取/显示多行（TianShi 每能力可有多条 Desc），右侧新增能力描述预览
### 书页布局与能力预览
- 侧栏“书页”标题放大
- 书页能力工作区改为两栏布局，能力描述预览移到能力描述下方
- 能力预览默认把 [任意文本] 渲染为黄色的该文本 + 小空格；战斗书页的能力/骰子能力文本同样使用该渲染
### 预览前缀行与黄色文本
- [任意文本] 渲染为黄色文本 + 小空格（不加粗）
- 战斗书页预览：FarArea 前置一行 [群体攻击-清算]、FarAreaEach 前置 [群体攻击-交锋]；特性含佚亡时最上方单开 [佚亡]
### 多语言（i18n）
- 顶部新增语言下拉框：默认中文，支持 English / 日本語，选择持久化
- 界面功能与按钮文本通过 `src/renderer/src/i18n.tsx` 字典管理：`useI18n().t('key', {var})`
- 以后新增界面文本时，请同时在 zh / en / jp 三个字典中补齐对应 key
### 关闭确认 / 无本地化选项 / 预览名称
- 未保存关闭时使用与应用同风格的自绘确认弹窗
- 书页名称 / 书页能力的本地化下拉框新增“无”选项
- 所有预览的名称与能力按当前选中的本地化文档显示；选择“无”时回退 XML 原始名称/脚本 ID
- CardInfo 的 ID 输入框与费用输入框增加间距，避免重叠
### 修复
- “无”本地化选项现在可正常选中并保持
- CardInfo ID 输入框按内容自适应，不再挤占费用输入框
- 书页预览的附加文本（佚亡/群体攻击）跟随编辑器语言
- 战斗书页表单的“本地化名称”跟随书页名称工作区当前选中的本地化文档
### 校对模式 / 工具面板 / 记忆
- 选择“无”本地化时清空列表
- 书页能力列表支持按能力描述搜索
- 记忆上次打开的 Mod 与文件
- 书页名称工具区新增校对模式；书页能力新增工具区（删除未使用能力 + 校对模式）
- 一键同步、删除孤儿、删除未使用能力均需二次确认
### 校对模式与“无”交互
- 书页能力搜索占位为“搜索 ID / 能力描述”
- 校对模式改为带颜色的按钮，开启内容显示在中间描述区（书页能力不显示原始 ID）
- 选择“无”只清空列表，工作区保持可见；新增/删除/复制/移动等操作禁用，切回语言即可恢复列表
### 滚动修复 / 可收纳工具 / 战斗书页简易模式
- 修复战斗书页详细区表单滚轮滚动（中心区补齐高度约束）
- 书页名称/能力的功能区默认收起为右侧箭头，点击展开/缩回，释放编辑空间
- 战斗书页“简易”模式改为专属面板：ID、费用、名称/本地化名称、卡牌能力、稀有度、射程、章节、骰子列表
- 简易骰子用 10 个图标快捷选择类型/属性并自动生成动作（招架/反击招架 G、闪避/反击闪避 E；远程时斩/打/刺用 F，否则 J/H/Z）
### 骰子警告 / 简易骰子 / 工具抽屉
- 预览中不合理骰子（如防御+斩击）图标回退进攻图标，点数用防御蓝色，并提示“骰子类型不合理”
- 简易骰子行：最小值 ~ 最大值 + 动作（禁用只读）
- 优先级与优先级脚本并排，互不重叠
- 书页名称/能力工具区改为右侧中间凸出箭头按钮，点击展开/收回

### 当前奇点插件关键词接入（2026-10-06）

- 开启顶部“帽子奇点”，在描述框上方点击“关键词库 / 插入”。可按 ID、显示名、插件搜索，选择 HatKeyword / HatKeywordLink / HatKeywordIcon；选中文字后可直接包裹。原有“正则补全”仍可用，支持中文前缀。
- “原版正则 / 奇点正则”沿用现有工作区，展示当前安装的 KeywordView、Abilities、Utils、Enchantments、Tags 内嵌词条及来源；Mod 正则仍编辑自身 XML。重复 RecognizeName 按行编辑，支持 KeepRecognizeName、IconName、IconSheetName。
- 普通文本匹配遵守 IsChangeAbility / IsChangePassive、HasBracket、多个 RecognizeName、KeepRecognizeName，区分大小写。按当前插件加载器规则，缺失 RecognizeName 时使用 Name，显式空元素禁用这一匹配。不会把词库所有 ID 都当作普通词替换；现有批量正则替换工具保持独立。
- 预览支持原生尖括号标签、`(~…~)` 写法、成对与嵌套关键词、Link、行内图标、换行、常用富文本及 noparse。按实际文档语言解析；双语校对各行独立解析。缺失语言按 cn → en → 已有语言回退，并通过 ⚠ 提示。未知 ID、缺失图片、旧图集和未支持的标签也会提示。
- 保存原始分语言文本与标签，不将渲染结果写回 XML。游戏原生字符串中的 `<` / `>` / 引号正常进行 XML 实体转义。插件图片仅保存在编辑器资源快照；插入全局资源 ID，由对应插件在游戏中提供，不会复制图片到用户 Mod，也不会写入教程专用的 `hat-resource:`。自定义外部图片仍走原有素材流程。
- 开发者更新资源：`./tools/Import-SingularityResources.ps1 -Assemblies <当前拆分DLL目录> -Dnlib <dnlib.dll路径>`。脚本只用 dnlib 读取元数据与内嵌资源，不初始化 DLL。清单保留程序集版本/哈希、完整资源名、资源哈希和语言；数量由扫描决定。仅单独图片/XML落盘，Unity AssetBundle只记录清单。
- 验证：`pnpm typecheck`、`pnpm test`、`pnpm --filter @ruina/desktop build`；构建后运行 `./tools/Test-KeywordsUI.ps1`，对仓库内独立样例 Mod 进行语言切换、搜索、插入、保存和图片不复制检查。结果及截图在 `docs/verification/keywords-ui*`，DLL 语义核对记录在同目录 `installed-keyword-*-il.txt`。
- 限制：这是编辑器预览，不执行游戏插件。Unity 专用字体、动态生成的旧图集、游戏运行配置开关和卡牌浮层不模拟；Link 显示为带提示的词条。缺失游戏原版名称时用识别名或 ID 显示；jp/kr 的部分安装资源仍是旧格式，界面会提示。插件升级后需刷新快照并重新构建。

### 奇点能力与核心书页重构（2026-10-06）

- “奇点能力”沿用书页能力的 ID 列表、本地化切换、描述原文和预览布局，只读显示 DLL 核验的书页/骰子 ability。页面不再列出 C# 方法、教程或 XML 示例。当前确认的直接 Script 为 `Hat_Enchantments_BasicAmmo_Dice`、`Hat_Enchantments_Exhaust_Dice`、`Hat_Enchantments_SharedCounter_Dice`，均属于骰子；书页筛选显示空状态。
- 佚亡 XML 原文保留 `[佚亡]`；预览按当前 KeywordView 的全局规则显示 Exhaust 图标＋佚亡名称，骰子与书页正文使用同一能力解析规则。骰子补全保留三个内置 ID，卡牌级补全排除它们。无本地 Ability.xml 时仍可预览插件内置文本。
- 敌我核心书页共用分组表单：基本信息、战斗属性、抗性、外观装备、被动与卡牌引用、高级字段；保留简易/详细/源码、保存、撤销和重做。右侧显示基础数值、实际抗性倍率、被动引用与所选文档的书页故事。预览不模拟被动或插件运行时增益。
- 按原始 Assembly-CSharp.dll 核对：BookOption 为 None/Basic/MultiDeck；Weak 为 ×2、Vulnerable 为 ×1.5，补全 Resist ×0.25 与 None；基础速度骰子读取顶层 SpeedDiceNum，初始抽牌为 3 + AddedStartDraw。新建 Mod 核心的初始/最大光芒为 3，生命/混乱/速度采用 CustomInvitation 初值 1。现有值不会自动重写。
- 被动逐条编辑 ID/Pid，Pid 留空表示当前 Mod、@origin 表示原版，也支持其他包名；保留未知属性与 XML 扩展。皮肤使用单值输入，类别保留列表，TextId 不再强制改为 -1。EquipEffect 内的 SpeedDiceNum 放在高级区；CustomOnlyCard 独立分组并标注 ExtraBridge 依赖。
- 扫描按敌我归并 `EquipPage_Enemy*.xml` / `EquipPage_Librarian*.xml` 的标准名和带分隔符的扩展文件名；文件须为 BookXmlRoot。不会再错误归为 EnemyUnit 工作区。显示与写入共用精确文档选择规则，修复同语言多文件编辑落入另一份文件的问题，并遵守“无”选择。移除重复本地化扫描；列表搜索使用完整名称和本地化名称。
- 验证：`pnpm typecheck`、`pnpm test`、`pnpm --filter @ruina/desktop build`，随后运行 `./tools/Test-AbilitiesUI.ps1`、`./tools/Test-CorePagesUI.ps1`、`./tools/Test-KeywordsUI.ps1`。样例与截图位于 `docs/verification/`。原始字段核对说明见 `docs/core-pages-source-audit.md`。
- 更新能力清单用 `./tools/Import-SingularityAbilities.ps1`，更新图片/关键词快照用 `./tools/Import-SingularityResources.ps1`；两者均只读 DLL。旧 C# 示例仅保留为历史验证材料，不再展示在能力页。

### 佚亡正文与当前图片目录修正（2026-10-06）

- 移除骰子正文对 `[佚亡]` 的硬编码跳过。当前 cn/HatKeyword_OriginKeyword.xml 的 `ExhaustOnUse_Keyword` 指定 RecognizeName=佚亡、KeywordIconId=Exhaust、HasBracket=true、IsChangeAbility=true、IsUnderline=true、IsAutoLink=true，因此正文按该规则渲染图标与名称。附魔的 `Hat_Enchantments_ExhaustDice_Keyword` 关闭正文替换，只控制自身边栏词条，不禁止全局规则匹配 `[佚亡]`。游戏 KeywordTextPatch 对 GetAbilityDesc/GetBehaviourDesc 均使用 cardEffectParser。
- “内置图片 → 奇点”改用当前 DLL 的完整图片清单，共 68 张，包括附魔弹药/出鞘/先制/复合/速览、当前拼点图标、特性图标和 UI 图片。显示资源 ID 与所属插件，支持搜索；不再由旧 singularity 图片目录决定展示。关键词解析仍只使用注册图标，UI 背景不会误作关键词图标。
- 当前快照重新读取 43 份内嵌 XML 与 68 张图片。2 个 Unity 资源包只记录元数据，不将资源包内特效材质冒充单独关键词图片；JSON、音频、许可文件归为 other。生成图片保持插件原始字节与 SHA256，不复制到用户 Mod。
- 验收：`tools/Test-AbilitiesUI.ps1` 检查中文佚亡图标＋名称，`tools/Test-PluginImagesUI.ps1` 检查全部图片可解码与插件搜索。反编译依据保存在 `docs/verification/Hat_Harmony.KeywordTextPatch.cs` 与 `Hat_Method.SpriteAssetCreator.cs`。

### 核心书页界面与原版能力目录（2026-10-06）

- 抗性改为斩击/突刺/打击 × 伤害/混乱的六格选择器，显示名称与倍率；皮肤编辑仅写入一个 CharacterSkin。既有重复节点在用户修改皮肤前不自动删除。
- 被动引用逐条显示名称，编辑 ID/Pid 保留未知属性；原版专属卡牌标注“仅原版”，高级自定义专属卡牌独立显示“需要 ExtraBridge 才能生效”。移除核心表单与预览的额外说明段落。
- 右侧预览解析原版和当前 Mod 的被动、卡牌名称；外部包未加载时保留引用 ID，不串用同 ID 的原版内容。核心预览、原版被动目录与被动名称描述工作区共用 PassivePreviewContent，包括费用、稀有度颜色、名称富文本及正文正则。
- tools/Import-VanillaAbilities.ps1 只读 BaseMod，快照包含 1,006 条被动记录、692 条能力描述、1,595 条卡牌名称，中/英/日三语和来源 SHA256。新增“原版被动”“原版书页能力”独立只读工作区，可搜索与复制 ID，不依赖帽子奇点开关，不向 Mod 写入内置资源。
- 验收入口：tools/Test-CorePagesUI.ps1、tools/Test-CoreReferencesUI.ps1、tools/Test-VanillaUI.ps1。覆盖单皮肤保存、同 ID 的包隔离、专属卡牌名称、共享被动预览富文本、三语搜索及只读浏览。
### 核心预览点击跳转（2026-10-06）

- 核心预览被动与专属书页支持鼠标、键盘跳转。当前 Mod 引用优先定位到被动/战斗书页数据工作区，并切换到包含该 ID 的具体文件；只有本地化记录时定位到名称工作区。
- 原版被动定位到原版被动目录，原版专属书页定位到新增的原版战斗书页目录。内置目录使用共享选中 ID 与语言状态，支持外部跳转定位；原版书页数据取自 BaseMod/StaticInfo/Card，显示费用、射程、能力与骰子。
- 未加载外部包或缺失 ID 不生成错误链接，跳转保留来源文档未保存修改。Test-CoreJumpsUI.ps1 覆盖跨文件跳转、原版定位、键盘操作、名称兜底、来源隔离和未保存数据保留。

### 附魔 3.4.1 资源同步与图片去重（2026-10-07）

- `tools/Import-SingularityProject.ps1 -Project <csproj>` 只读指定工程的编译项与内嵌资源，更新该插件的能力和资源快照，保留其他插件；记录源码、资源 SHA256 和程序集版本。当前 HatSingularity.Enchantments 为 3.4.1.0，7 个骰子能力、25 份 XML/图片资源，中文与英文原文按字节保留。
- 补齐普通、斩击、突刺、打击 4 个盾击 Script、关键词与图标，示例使用招架骰子。骰子预览按已知 Script 顺序选择第一份盾击，将独立词条置前，保留其他能力正文；不按旧 ShieldBashPriority 排序。编辑器不执行自定义 C# 能力，缺少运行时能力列表时仅按文本中的独立盾击词条顺序预览。
- “内置图片 → 其他”隐藏已在“奇点”收录的 9 项同 ID 图片（已核对字节相同）；保留底层资源供旧图标引用使用。“奇点”当前完整展示 69 张资源，包含替换后的盾击图标。
- `Test-AbilitiesUI.ps1` 验证 4 个盾击变体原文、名称与图标；`Test-PluginImagesUI.ps1` 验证图片解码和“其他”去重。预览测试覆盖普通/固定盾击顺序、正文保留及开关作用域。

### 贯通能力接入（2026-10-07）

- 更新 HatSingularity.Enchantments 工程快照至 3.6.0.0，包含 8 个骰子能力、26 份内嵌 XML/图片资源；奇点图片目录共 70 张。
- 接入 `Hat_Enchantments_Throughout_Dice`，用于骰子 Script 补全；关键词为 `Hat_Enchantments_Throughout_Dice_Keyword`，图标为 `Hat_Enchantments_Throughout_Dice`。奇点能力目录、关键词库、战斗书页预览共用插件中英文原文与图片，示例使用进攻型突刺骰子。
- 验证覆盖中英文名称、原文、图标、详情提示、帽子奇点开关及能力分类；不向界面添加额外说明文字。

### 奇点四语与骰子适用条件（2026-10-11）

- `tools/Import-SingularityLocalization.ps1` 导入附魔 3.7.0.0 四语工程资源、Tags/UI 文本，以及 `output/SingularityLocalization-20261011/CoreReady` 中三个本体组件的新译文。CoreReady 优先于旧 DLL；导入保留原始 XML 字节和来源 SHA256。
- 能力目录的 cn/en/jp/kr 选择保存到工作区状态。正则、关键词补全与预览使用当前所选文档语言，不随界面语言改变；ja/ko 别名可识别，未知资源语言回退 en。Discover 中文改为“查阅”，ID 不变。
- 骰子预览显式传入 Type/Detail：盾击仅 Def/Standby 的 Guard 参与词条汇总；贯通按 Slash/Penetrate/Hit 识别，包括反击攻击。附魔片段解析支持仅过滤不适用的独立词条，保留其他正文与原文；原生主 Script 描述不经过附魔删除入口。编辑器不执行 C#，也不推断游戏运行时动态授予列表。
- `Test-LocalizationUI.ps1` 验证四语能力、图片、正则、文档预览、实时补全、关键词库和切页状态保留；`localization.test.mjs` 覆盖完整骰子类型矩阵、原生与附魔片段区分、回退及四语完整性。

### 附魔 3.9 词条迁移（2026-10-13）

- 四语资源更新至附魔 3.9.0.0；精准、连击、谐振及其三张图标由附魔插件提供。谐振名称保留，英文说明按向上取整。原生接口 GetInsightValue、Discover 系列标题/按钮和图标名称保持不变。
- 关键词迁移映射：`Hat_Enchantments_DiscoverCard_Keyword` → `Hat_Enchantments_BrowseCard_Keyword`；`DreamUniverse_Insight_Keyword` → `Hat_Enchantments_Precision_Keyword`；`DreamUniverse_MultipleHit_Keyword` → `Hat_Enchantments_MultipleHit_Keyword`；`DreamUniverse_Harmonious_Keyword` → `Hat_Enchantments_Harmonious_Keyword`。旧 ID 可在目录、关键词库及补全中搜索新条目；渲染旧引用只提示新 ID，不改写私人文档。选择并插入新条目由用户操作。
- 骰子佚亡示例改为 `(~HatKeyword id="Hat_Enchantments_ExhaustDice_Description_Keyword"/~)`；边栏保留 `Hat_Enchantments_ExhaustDice_Keyword`。专用描述词条只接受显式标签，复用 Exhaust 图片；普通书页 `[佚亡]` 保留原规则。
- 精准、连击、谐振、贯通、骰子佚亡描述及盾击家族仅在出现两个及以上可识别词条时汇总前置。单个词条的位置、数值、类型和标签保持原样：`满足条件时 (~HatKeyword id="Hat_Enchantments_Precision_Keyword"~)精准:2(~/HatKeyword~)` 不会被前移。重复数值标签按可见最高值预览；重复盾击按已知能力顺序选取。无词条但已知内置 Script 时补全说明。
- 编辑器不执行 C#，动态数值仍由游戏真实能力元数据决定。条件句中的多个独立同类词条仍可能合并，不猜测自然语言条件范围；混合效果标签、noparse 和普通正文保留。所有汇总只影响预览。

### HatKeyword 参数预览

- 接入附魔插件 3.12 的自闭合 `HatKeyword value` 格式，例如 `(~HatKeyword id="Hat_Enchantments_MultipleHit_Keyword" value="2"/~)`。名称取当前文档语言，参数按普通文字拼接英文冒号，沿用关键词图标、样式和详情。
- 支持属性换序、单双引号、空参数、空格及引号内的 `>` / `~)`；参数中的标签不会变成富文本。外层 XML 与内层属性各解码一次，预览不回写原文。未知 ID、无效属性和 noparse 示例不会被参数解析器展开。
- 关键词库可编辑选中参数标签，精准、连击和谐振补全默认生成 `value=""` 并定位到参数。重复数字与当前语言盾击类型参与既有预览汇总，表达式及未知类型保留。
- `Test-KeywordValuesUI.ps1` 验证四语图标名称、参数编辑、自动补全、选择范围替换及 XML 保存回读；`keyword-value.test.mjs` 覆盖解析、转义、字面量、汇总和过滤。
- `aggregation.test.mjs` 覆盖四语单词条保留、重复最高值、盾击首项、佚亡身份隔离和旧 ID 提示；界面验收包含旧 ID 搜索、新图标与专用佚亡预览。
