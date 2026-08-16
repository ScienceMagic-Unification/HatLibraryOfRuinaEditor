import type { ModuleDefinition } from '@ruina/editor-core'

/** 内置图片工作区：射程/骰子/章节/其他四个选项卡，只读平铺展示。 */
export const builtinImagesModule: ModuleDefinition = {
  id: 'builtin-images',
  title: '内置图片',
  icon: 'Image',
  description: '内置射程、骰子、章节与其他图片资源（只读）',
  builtin: true,
  readonly: true,
  builtinImages: true,
  entity: {
    root: '__builtin_images__',
    entity: 'Asset',
    idAttr: 'Name',
    idOnlyList: true,
    fields: []
  }
}

/** 内置正则查看器：原版正则（BattleEffectTextRootExtra）只读表单模板。 */
export const vanillaRegexModule: ModuleDefinition = {
  id: 'vanilla-regex',
  title: '原版正则',
  icon: 'FileCode2',
  description: '原版关键词/效果文本词典（只读）',
  builtin: true,
  readonly: true,
  builtinRegex: true,
  entity: {
    root: 'BattleEffectTextRootExtra',
    entity: 'BattleEffectTextExtra',
    idAttr: 'ID',
    containerPath: ['extraTextList'],
    displayField: 'Name',
    fields: []
  }
}

/** 内置正则查看器：奇点正则（BattleEffectTextRootExtra）只读表单模板。 */
export const singularityRegexModule: ModuleDefinition = {
  id: 'singularity-regex',
  title: '奇点正则',
  icon: 'FileCode2',
  description: '奇点关键词/效果文本词典（只读）',
  builtin: true,
  readonly: true,
  builtinRegex: true,
  entity: {
    root: 'BattleEffectTextRootExtra',
    entity: 'BattleEffectTextExtra',
    idAttr: 'ID',
    containerPath: ['extraTextList'],
    displayField: 'Name',
    fields: []
  }
}

/** 可编辑的 Mod 正则工作区（复用只读模板，读取/保存路径待实装）。 */
export const modRegexModule: ModuleDefinition = {
  id: 'mod-regex',
  title: 'Mod正则',
  icon: 'FileCode2',
  description: '当前 Mod 的自定义正则（可编辑，读取路径待实装）',
  builtin: true,
  readonly: false,
  builtinRegex: true,
  modRegex: true,
  localizeRoots: [
    {
      root: 'BattleEffectTextRootExtra',
      entity: 'BattleEffectTextExtra',
      idAttr: 'ID',
      containerPath: ['extraTextList'],
      fields: [
        { name: 'Name', label: '名称' },
        { name: 'Desc', label: '描述', kind: 'multiline' }
      ]
    }
  ],
  entity: {
    root: 'BattleEffectTextRootExtra',
    entity: 'BattleEffectTextExtra',
    idAttr: 'ID',
    containerPath: ['extraTextList'],
    displayField: 'Name',
    fields: []
  }
}

/** 奇点大工作区右侧挂载的四个模块。 */
export const singularityModules: ModuleDefinition[] = [
  builtinImagesModule,
  vanillaRegexModule,
  singularityRegexModule,
  modRegexModule
]