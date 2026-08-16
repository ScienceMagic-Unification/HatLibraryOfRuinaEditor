import type { ModuleDefinition } from '@ruina/editor-core'

/**
 * 卡牌能力工作区：本地化驱动（无 Data 数据文件）。
 * 自动发现根节点为 BattleCardAbilityDescRoot 的所有语言文件，作为数据区多语言切换。
 */
export const cardAbilityModule: ModuleDefinition = {
  id: 'cardability',
  title: '书页能力',
  icon: 'BadgeCheck',
  description: '书页 / 骰子能力描述（多语言）',
  entity: {
    root: 'BattleCardAbilityDescRoot',
    entity: 'BattleCardAbility',
    idAttr: 'ID',
    idOnlyList: true,
    quickFields: ['Desc'],
    fields: [{ kind: 'multiline', name: 'Desc', label: '能力描述', multiLineElements: true }]
  },
  localizeRoots: [
    {
      root: 'BattleCardAbilityDescRoot',
      entity: 'BattleCardAbility',
      idAttr: 'ID',
      fields: [{ name: 'Desc', label: '能力描述', kind: 'multiline' }]
    }
  ],
  regexRules: [
    {
      id: 'replace-keyword-prefix',
      name: '批量替换关键词前缀',
      pattern: 'DreamUniverse_',
      replacement: 'MyMod_',
      scope: 'selected'
    }
  ]
}