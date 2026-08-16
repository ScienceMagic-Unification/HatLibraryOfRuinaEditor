import type { ModuleDefinition } from '@ruina/editor-core'

/**
 * 被动能力工作区：本地化驱动（无 Data 数据文件）。
 * 自动发现根节点为 PassiveDescRoot 的所有语言文件，作为数据区多语言切换，
 * 右侧提供被动名称/描述的同步、清理与校对预览工具。
 */
export const passiveAbilityModule: ModuleDefinition = {
  id: 'passiveability',
  title: '名称与描述',
  icon: 'BadgeCheck',
  description: '被动名称与描述（多语言）',
  entity: {
    root: 'PassiveDescRoot',
    entity: 'PassiveDesc',
    idAttr: 'ID',
    displayField: 'Name',
    accentFromModuleId: 'passive',
    quickFields: ['Name'],
    fields: [
      { kind: 'text', name: 'Name', label: '名称', required: true },
      { kind: 'multiline', name: 'Desc', label: '描述' }
    ]
  },
  localizeRoots: [
    {
      root: 'PassiveDescRoot',
      entity: 'PassiveDesc',
      idAttr: 'ID',
      fields: [
        { name: 'Name', label: '名称' },
        { name: 'Desc', label: '描述', kind: 'multiline' }
      ]
    }
  ],
  regexRules: [
    {
      id: 'rename-passive-desc-prefix',
      name: '批量替换被动描述前缀',
      pattern: 'DreamUniverse_',
      replacement: 'MyMod_',
      scope: 'selected'
    }
  ]
}