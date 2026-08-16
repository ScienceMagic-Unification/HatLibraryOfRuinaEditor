import type { ModuleDefinition } from '@ruina/editor-core'

/**
 * 效果文本工作区：读取 Mod 的 EffectText / BattleEffectTextRootExtra。
 * effectTextList 下为 BattleEffectText，extraTextList 下为 BattleEffectTextExtra。
 * 这里仅开放 Name 与 Desc 的读取/编辑，修改会直接作用到共享文档。
 */
export const effectTextModule: ModuleDefinition = {
  id: 'effecttext',
  title: '效果文本',
  icon: 'FileText',
  description: '效果文本 BattleEffectText / BattleEffectTextExtra（仅名称与描述可编辑）',
  entity: {
    root: 'BattleEffectTextRootExtra',
    entity: 'BattleEffectTextExtra',
    idAttr: 'ID',
    containerPath: ['extraTextList'],
    entitySources: [
      { entity: 'BattleEffectText', containerPath: ['effectTextList'] },
      { entity: 'BattleEffectTextExtra', containerPath: ['extraTextList'] }
    ],
    idOnlyList: true,
    displayField: 'Name',
    quickFields: ['Name'],
    fields: [
      { kind: 'text', name: 'Name', label: '名称', required: true },
      { kind: 'multiline', name: 'Desc', label: '描述' }
    ]
  },
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
  ]
}