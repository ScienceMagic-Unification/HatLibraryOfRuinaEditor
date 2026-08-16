/** 字段定义：描述一种 XML 实体如何渲染成表单、如何读写、如何校验 */

export interface BaseFieldDef {
  name: string
  label?: string
  help?: string
  placeholder?: string
  /** 输入框宽度 Tailwind class，如 w-24 / flex-1 */
  widthClass?: string
  /** 值为空时从 XML 中移除该元素 */
  omitWhenEmpty?: boolean
}

export type ScalarFieldDef = BaseFieldDef &
  (
    | { kind: 'text'; required?: boolean; placeholder?: string; autocomplete?: 'page-artwork' | 'page-ability' }
    | { kind: 'int'; required?: boolean; min?: number; max?: number; digitsOnly?: boolean; optional?: boolean }
    | { kind: 'enum'; values: string[]; required?: boolean; asChips?: boolean; labels?: Record<string, string>; colors?: Record<string, string>; icons?: Record<string, string>; dots?: boolean; allowCustom?: boolean; customNumeric?: boolean; noIdToggle?: boolean }
    | { kind: 'multiline'; required?: boolean; multiLineElements?: boolean }
    | { kind: 'bool'; required?: boolean }
  )

export interface AttrsFieldDef extends BaseFieldDef {
  kind: 'attrs'
  attrs: ScalarFieldDef[]
}

export interface MultiFieldDef extends BaseFieldDef {
  kind: 'multi'
  values?: string[]
  labels?: Record<string, string>
}

/** 单个属性字段：读写指定元素（如 Spec）上的一个属性（如 Cost） */
export interface AttrFieldDef extends BaseFieldDef {
  kind: 'attr'
  element: string
  attr: string
  field: ScalarFieldDef
}

export interface MarkerFieldDef extends BaseFieldDef {
  kind: 'marker'
}

export interface ListFieldDef extends BaseFieldDef {
  kind: 'list'
  item: string
  attrs: ScalarFieldDef[]
  itemTextField?: string
  /** 未开启帽子奇点时的最大条目数 */
  maxItems?: number
  /** 添加按钮文案 */
  addLabel?: string
}

export type FieldDef = ScalarFieldDef | AttrsFieldDef | MultiFieldDef | MarkerFieldDef | ListFieldDef | AttrFieldDef

export interface EntitySchema {
  root: string
  entity: string
  /** 同一容器下可同时识别的实体名（例如 BattleEffectText / BattleEffectTextExtra） */
  entities?: string[]
  /** 多实体/多容器来源（例如 EffectText 的 effectTextList 与 extraTextList） */
  entitySources?: { entity: string; containerPath?: string[] }[]
  idAttr: string
  /** 实体在根节点下的容器路径，例如本地化文件中的 ['cardDescList'] */
  containerPath?: string[]
  /** 列表区用于显示实体名称的字段（默认 Name） */
  displayField?: string
  /** 简易模式显示并允许编辑的字段名集合 */
  quickFields?: string[]
  /** ID 是否仅允许数字 */
  idNumeric?: boolean
  /** 渲染在 ID 行右侧的字段名集合 */
  headerFields?: string[]
  /** 固定值字段（隐藏但始终写入该值），例如 TextId: '-1' */
  locked?: Record<string, string>
  /** 新建实体时的默认值（字段名 -> 值） */
  defaults?: Record<string, string>
  /** 列表文字颜色从该工作区同名 ID 的实体取稀有度主题色（如卡牌名称 -> CardInfo） */
  accentFromModuleId?: string
  /** 列表只显示 ID（不显示名称），ID 列宽随内容动态调整 */
  idOnlyList?: boolean
  fields: FieldDef[]
}

export interface LocalizationFieldDef {
  name: string
  label?: string
  kind?: 'text' | 'multiline'
}

/**
 * 本地化根节点模板：自动发现时，把根节点名相同的本地化 XML 归入当前工作区。
 * 语言在运行时按文件/目录名（cn、en…）检测，检测不到时按文本内容推断。
 */
export interface LocalizationRootDef {
  root: string
  containerPath?: string[]
  entity: string
  idAttr?: string
  fields: LocalizationFieldDef[]
}

export interface ResourceWorkspaceDef {
  /** 相对 Mod 根目录的资源目录，例如 Resource/CombatPageArtwork */
  dir: string
  type?: 'image'
  /** 资源工作区选中项回填到该模块的字段（例如卡牌图片） */
  bindModuleId?: string
  bindField?: string
  /** 是否递归读取子文件夹图片 */
  recursive?: boolean
  /** 默认不自动读取目录，需要手动重定向 */
  defaultEmpty?: boolean
  /** 小方形图标展示（如 Buff 图标） */
  square?: boolean
}

export interface ArtworkPreviewDef {
  kind: 'artwork'
  /** 数据实体中存放资源名的字段 */
  field: string
  /** 相对 Mod 根目录的资源目录 */
  assetGlob: string
  /** 点击本地化名称跳转的工作区 ID（如卡牌名称） */
  nameWorkspaceId?: string
  /** 点击能力本地化文本跳转的工作区 ID（如卡牌能力） */
  abilityWorkspaceId?: string
}

export interface RegexRule {
  id: string
  name: string
  description?: string
  pattern: string
  replacement: string
  flags?: string
  scope: 'file' | 'selected' | 'field'
  field?: string
}

export interface ModuleDefinition {
  id: string
  title: string
  icon: string
  description?: string
  /** 数据文件根节点名：自动发现时把该根节点的 Data/*.xml 绑定为本工作区 */
  dataRoot?: string
  /** 显式文件（Mod 根目录相对路径）：优先于 dataRoot 使用 */
  dataFile?: string
  /** 同一工作区的多个数据文件（绝对路径），可与文档切换器配合 */
  dataFiles?: string[]
  /** 本地化根节点模板：根节点名相同的本地化 XML 自动挂入本工作区 */
  localizeRoots?: LocalizationRootDef[]
  entity: EntitySchema
  preview?: ArtworkPreviewDef
  /** 资源型工作区（不是 XML 工作区，例如图片库） */
  resource?: ResourceWorkspaceDef
  /** 只读工作区（例如内置资源/内置正则查看器） */
  readonly?: boolean
  /** 内置工作区，内容来自应用而不是当前 Mod */
  builtin?: boolean
  /** 内置图片工作区（奇点大工作区） */
  builtinImages?: boolean
  /** 内置正则查看器（奇点大工作区） */
  builtinRegex?: boolean
  /** 可编辑的 Mod 正则工作区（读取路径待实装） */
  modRegex?: boolean
  regexRules?: RegexRule[]
  /** 加载时从数据实体中移除的字段（如废弃的 SpecialEffect） */
  stripFields?: string[]
}

export interface ValidationIssue {
  entityId: string
  entityIndex: number
  field?: string
  message: string
  severity: 'error' | 'warning'
}

export const isScalarField = (f: FieldDef): f is ScalarFieldDef =>
  f.kind === 'text' || f.kind === 'int' || f.kind === 'enum' || f.kind === 'multiline' || f.kind === 'bool'
