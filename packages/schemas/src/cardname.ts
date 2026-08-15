import type { ModuleDefinition } from '@ruina/editor-core'

/**
 * 卡牌名称工作区：本地化驱动。
 * 自动发现根节点为 BattleCardDescRoot 的所有语言文件，数据区可切换语言批量编辑名称。
 */
export const cardNameModule: ModuleDefinition = {
  id: 'cardname',
  title: '书页名称',
  icon: 'Tags',
  description: '战斗书页名称（多语言）',
  entity: {
    root: 'BattleCardDescRoot',
    entity: 'BattleCardDesc',
    idAttr: 'ID',
    containerPath: ['cardDescList'],
    displayField: 'LocalizedName',
    accentFromModuleId: 'cardinfo',
    quickFields: ['LocalizedName'],
    fields: [{ kind: 'text', name: 'LocalizedName', label: '卡牌名称', required: true }]
  },
  localizeRoots: [
    {
      root: 'BattleCardDescRoot',
      containerPath: ['cardDescList'],
      entity: 'BattleCardDesc',
      idAttr: 'ID',
      fields: [{ name: 'LocalizedName', label: '卡牌名称' }]
    }
  ]
}