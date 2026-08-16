import type { ModuleDefinition } from '@ruina/editor-core'

/** 被动能力模块：数据区 PassiveList.xml + 本地化区 cn/en PassiveDesc */
export const passiveModule: ModuleDefinition = {
  id: 'passive',
  title: '被动能力',
  icon: 'Sparkles',
  description: '被动技能数据与本地化描述',
  dataRoot: 'PassiveXmlRoot',
  entity: {
    root: 'PassiveXmlRoot',
    entity: 'Passive',
    idAttr: 'ID',
    displayField: 'Name',
    quickFields: ['Name', 'Rarity', 'Cost', 'Desc'],
    headerFields: ['Cost'],
    defaults: { CanGivePassive: 'true', InnerType: '-1' },
    fields: [
      { kind: 'bool', name: 'Negative', label: '负面被动' },
      { kind: 'bool', name: 'IsHide', label: '隐藏' },
      {
        kind: 'enum',
        name: 'Rarity',
        label: '稀有度',
        values: ['Common', 'Uncommon', 'Rare', 'Unique'],
        asChips: true,
        dots: true,
        labels: { Common: '平装', Uncommon: '精装', Rare: '限定', Unique: '艺术' },
        colors: { Common: '#A8F29F', Uncommon: '#9AC6FA', Rare: '#BA97FF', Unique: '#FFC075' }
      },
      { kind: 'bool', name: 'Lock', label: '锁定' },
      { kind: 'bool', name: 'CanGivePassive', label: '可转让' },
      { kind: 'bool', name: 'CanReceivePassive', label: '可接收' },
      { kind: 'int', name: 'InnerType', label: '互斥类型', digitsOnly: true, placeholder: '-1', widthClass: 'w-24', optional: true },
      { kind: 'marker', name: 'UseCustomInnerType', label: '高级自定义互斥类型', help: '需要 ExtraBridge 插件' },
      { kind: 'int', name: 'Cost', label: '费用', min: 0, widthClass: 'w-20' },
      { kind: 'text', name: 'Script', label: '脚本' },
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
        { name: 'Name', label: '本地化名称' },
        { name: 'Desc', label: '本地化描述', kind: 'multiline' }
      ]
    }
  ],
  regexRules: [
    {
      id: 'rename-passive-script',
      name: '批量替换被动脚本前缀',
      pattern: 'DreamUniverse_',
      replacement: 'MyMod_',
      scope: 'selected'
    }
  ]
}