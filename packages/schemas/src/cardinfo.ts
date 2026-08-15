import type { ModuleDefinition } from '@ruina/editor-core'
import { optionMeta } from './meta'

/** 战斗书页模块：数据区 CardInfo.xml + 本地化区 cn/en BattlesCards + 卡图预览 */
export const cardInfoModule: ModuleDefinition = {
  id: 'cardinfo',
  title: '战斗书页',
  icon: 'Swords',
  description: '卡牌数据、骰子行为、本地化与卡图预览',
  dataRoot: 'DiceCardXmlRoot',
  entity: {
    root: 'DiceCardXmlRoot',
    entity: 'Card',
    idAttr: 'ID',
    displayField: 'Name',
    idNumeric: true,
    headerFields: ['Cost', 'EmotionLimit'],
    locked: { TextId: '-1', Category: 'None' },
    defaults: { Range: 'Near', Affection: 'One', Cost: '0', EmotionLimit: '0', Chapter: '1', Priority: '1', PriorityScript: '', MaxNum: '150' },
    quickFields: ['Name', 'Script', 'Rarity', 'Range', 'Affection', 'Option'],
    fields: [
      { kind: 'text', name: 'Name', label: '名称', required: true },
      { kind: 'text', name: 'Artwork', label: '卡图资源', help: 'Resource/CombatPageArtwork 下的文件名', autocomplete: 'page-artwork' },
      { kind: 'text', name: 'Script', label: '卡牌能力', help: 'DLL 中的卡牌脚本类名', autocomplete: 'page-ability' },
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
      {
        kind: 'attr',
        element: 'Spec',
        attr: 'Range',
        name: 'Range',
        label: '射程',
        field: {
          kind: 'enum',
          name: 'Range',
          values: ['Near', 'Far', 'Special', 'Instance', 'FarArea', 'FarAreaEach'],
          asChips: true,
          labels: { Near: '近战', Far: '远程', Special: '特殊', Instance: '装备', FarArea: '群体攻击-清算', FarAreaEach: '群体攻击-交锋' },
          icons: { Near: 'near', Far: 'far', Special: 'special', Instance: 'instance', FarArea: 'aoe', FarAreaEach: 'aoe' }
        }
      },
      {
        kind: 'attr',
        element: 'Spec',
        attr: 'Affection',
        name: 'Affection',
        label: '目标',
        field: {
          kind: 'enum',
          name: 'Affection',
          values: ['One', 'Team', 'All', 'Passive', 'TeamNear'],
          asChips: true,
          labels: { One: '单体', Team: '敌方全体', All: '所有角色', Passive: '被动指定', TeamNear: '每个敌方目标' }
        }
      },
      {
        kind: 'multi',
        name: 'Option',
        label: '特性',
        values: ['Basic', 'OnlyPage', 'EGO', 'EgoPersonal', 'Personal', 'NoInventory', 'ExhaustOnUse', 'EgoChange'],
        labels: optionMeta
      },
      { kind: 'multi', name: 'Keyword', label: '关键词', help: '自由输入，回车添加' },
      {
        kind: 'attr',
        element: 'Spec',
        attr: 'Cost',
        name: 'Cost',
        label: '费用',
        field: { kind: 'int', name: 'Cost', min: 0, digitsOnly: true }
      },
      {
        kind: 'attr',
        element: 'Spec',
        attr: 'EmotionLimit',
        name: 'EmotionLimit',
        label: '情感等级限制',
        field: { kind: 'int', name: 'EmotionLimit', min: 0, digitsOnly: true }
      },
      {
        kind: 'list',
        name: 'BehaviourList',
        label: '骰子列表',
        item: 'Behaviour',
        maxItems: 5,
        addLabel: '添加骰子',
        attrs: [
          { kind: 'int', name: 'Min', label: '最小值' },
          { kind: 'int', name: 'Dice', label: '最大值' },
          { kind: 'enum', name: 'Type', label: '类型', values: ['Atk', 'Def', 'Standby'] },
          { kind: 'enum', name: 'Detail', label: '属性', values: ['Hit', 'Guard', 'Evasion', 'Penetrate', 'Slash'] },
          {
            kind: 'enum',
            name: 'Motion',
            label: '动作',
            values: ['H', 'J', 'Z', 'G', 'E', 'F', 'N', 'S', 'S1', 'S2', 'S3', 'S4', 'S5', 'H2', 'J2', 'Z2', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15']
          },
          { kind: 'text', name: 'EffectRes', label: '特效资源' },
          { kind: 'text', name: 'Script', label: '骰子能力', autocomplete: 'page-ability' },
          { kind: 'text', name: 'ActionScript', label: '动作脚本' }
        ]
      },
      {
        kind: 'enum',
        name: 'Chapter',
        label: '章节',
        values: ['1', '2', '3', '4', '5', '6', '7'],
        asChips: true,
        noIdToggle: true,
        allowCustom: true,
        customNumeric: true,
        labels: { '1': '传闻', '2': '都市怪谈', '3': '都市传说', '4': '都市恶疾', '5': '都市梦魇', '6': '都市之星', '7': '杂质' },
        icons: { '1': 'ch1', '2': 'ch2', '3': 'ch3', '4': 'ch4', '5': 'ch5', '6': 'ch6', '7': 'ch7' }
      },
      { kind: 'int', name: 'Priority', label: '优先级', digitsOnly: true },
      { kind: 'text', name: 'PriorityScript', label: '优先级脚本' },
      { kind: 'int', name: 'MaxNum', label: '最大数量', digitsOnly: true, widthClass: 'w-24', placeholder: '150', omitWhenEmpty: true },
      { kind: 'marker', name: 'SkinChange', label: '皮肤切换' },
      { kind: 'enum', name: 'SkinChangeType', label: '切换类型', values: ['EGO', 'Normal'], asChips: true, noIdToggle: true, omitWhenEmpty: true },
      { kind: 'int', name: 'SkinHeight', label: '皮肤身高', digitsOnly: true, widthClass: 'w-24', placeholder: '0', omitWhenEmpty: true },
      { kind: 'int', name: 'MaxCooltimeForEgo', label: 'E.G.O 冷却', digitsOnly: true, widthClass: 'w-24', placeholder: '9', optional: true },
      { kind: 'marker', name: 'MapChange', label: '地图切换' }
    ]
  },
  stripFields: ['SpecialEffect'],
  localizeRoots: [
    {
      root: 'BattleCardDescRoot',
      containerPath: ['cardDescList'],
      entity: 'BattleCardDesc',
      idAttr: 'ID',
      fields: [
        { name: 'LocalizedName', label: '本地化名称' },
        { name: 'LocalizedDesc', label: '本地化描述', kind: 'multiline' }
      ]
    }
  ],
  preview: {
    kind: 'artwork',
    field: 'Artwork',
    assetGlob: 'Resource/CombatPageArtwork',
    nameWorkspaceId: 'cardname',
    abilityWorkspaceId: 'cardability'
  },
  regexRules: [
    {
      id: 'rename-art-prefix',
      name: '批量替换卡图前缀',
      description: '把选中卡片的 Artwork 资源前缀 DreamUniverse_ 换成新前缀',
      pattern: 'DreamUniverse_',
      replacement: 'MyMod_',
      scope: 'selected'
    },
    {
      id: 'fix-chapter',
      name: '批量修正章节号',
      description: '把 Chapter 值 -100514 替换为新章节',
      pattern: '<Chapter>-100514</Chapter>',
      replacement: '<Chapter>-200000</Chapter>',
      scope: 'file'
    },
    {
      id: 'clear-script',
      name: '清空指定脚本字段',
      description: '仅对选中实体的 Script 字段生效',
      pattern: '.+',
      replacement: '',
      flags: 'g',
      scope: 'field',
      field: 'Script'
    }
  ]
}