import type { ModuleDefinition } from '@ruina/editor-core'
import { optionMeta } from './meta'

/** 抗性枚举：普通 / 耐受 / 脆弱 / 致命 / 免疫 */
const resistValues = ['Normal', 'Endure', 'Weak', 'Vulnerable', 'Immune'] as const
const resistLabels: Record<string, string> = {
  Normal: '普通',
  Endure: '耐受',
  Weak: '脆弱',
  Vulnerable: '致命',
  Immune: '免疫'
}
const resistColors: Record<string, string> = {
  Normal: '#9CA3AF',
  Endure: '#E9B44C',
  Weak: '#5BC0DE',
  Vulnerable: '#E56B6B',
  Immune: '#B07FE8'
}

const rarityLabels: Record<string, string> = {
  Common: '平装',
  Uncommon: '精装',
  Rare: '限定',
  Unique: '艺术'
}
const rarityColors: Record<string, string> = {
  Common: '#A8F29F',
  Uncommon: '#9AC6FA',
  Rare: '#BA97FF',
  Unique: '#FFC075'
}

const rangeTypeLabels: Record<string, string> = {
  Melee: '近战',
  Range: '远程',
  Hybrid: '混合'
}

const chapterLabels: Record<string, string> = {
  '1': '传闻',
  '2': '都市怪谈',
  '3': '都市传说',
  '4': '都市恶疾',
  '5': '都市梦魇',
  '6': '都市之星',
  '7': '杂质'
}

/** 核心书页（EquipPage_Enemy.xml / EquipPage_Librarian.xml）共用的实体字段模型 */
function bookEntity(): ModuleDefinition['entity'] {
  return {
    root: 'BookXmlRoot',
    entity: 'Book',
    idAttr: 'ID',
    displayField: 'Name',
    idNumeric: true,
    headerFields: ['Rarity'],
    locked: { TextId: '-1' },
    defaults: {
      HpReduction: '0',
      HP: '0',
      DeadLine: '0',
      Break: '0',
      SpeedMin: '0',
      Speed: '0',
      EquipSpeedDiceNum: '0',
      SResist: 'Normal',
      PResist: 'Normal',
      HResist: 'Normal',
      SBResist: 'Normal',
      PBResist: 'Normal',
      HBResist: 'Normal',
      MaxPlayPoint: '0',
      StartPlayPoint: '0',
      AddedStartDraw: '0',
      Rarity: 'Common',
      CharacterSkinType: 'Lor',
      SkinGender: 'N',
      Chapter: '1',
      Episode: '0',
      RangeType: 'Melee',
      SpeedDiceNum: '1',
      RandomFace: 'true',
      SuccessionPossibleNumber: '9'
    },
    quickFields: ['Name', 'Rarity', 'Chapter', 'RangeType'],
    fields: [
      { kind: 'text', name: 'Name', label: '名称', required: true },
      {
        kind: 'enum',
        name: 'Rarity',
        label: '稀有度',
        values: ['Common', 'Uncommon', 'Rare', 'Unique'],
        asChips: true,
        dots: true,
        labels: rarityLabels,
        colors: rarityColors
      },
      {
        kind: 'enum',
        name: 'RangeType',
        label: '攻击类型',
        values: ['Melee', 'Range', 'Hybrid'],
        asChips: true,
        labels: rangeTypeLabels,
        icons: { Melee: 'near', Range: 'far', Hybrid: 'special' }
      },
      { kind: 'int', name: 'Episode', label: '章节幕', digitsOnly: true },
      {
        kind: 'multi',
        name: 'Option',
        label: '特性',
        values: ['Basic', 'OnlyPage', 'EGO', 'EgoPersonal', 'Personal', 'NoInventory', 'ExhaustOnUse', 'EgoChange'],
        labels: optionMeta
      },
      { kind: 'text', name: 'BookIcon', label: '书页图标' },
      { kind: 'child', element: 'EquipEffect', name: 'HP', label: '生命值', field: { kind: 'int', name: 'HP', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'Break', label: '混乱抗性', field: { kind: 'int', name: 'Break', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'HpReduction', label: '生命削减', field: { kind: 'int', name: 'HpReduction', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'DeadLine', label: 'DeadLine', field: { kind: 'int', name: 'DeadLine', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'SpeedMin', label: '速度下限', field: { kind: 'int', name: 'SpeedMin', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'Speed', label: '速度上限', field: { kind: 'int', name: 'Speed', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'EquipSpeedDiceNum', label: '速度骰子数(战斗)', field: { kind: 'int', name: 'SpeedDiceNum', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'SResist', label: '斩击抗性', field: { kind: 'enum', name: 'SResist', values: [...resistValues], asChips: true, labels: resistLabels, dots: true, colors: resistColors } },
      { kind: 'child', element: 'EquipEffect', name: 'PResist', label: '突刺抗性', field: { kind: 'enum', name: 'PResist', values: [...resistValues], asChips: true, labels: resistLabels, dots: true, colors: resistColors } },
      { kind: 'child', element: 'EquipEffect', name: 'HResist', label: '打击抗性', field: { kind: 'enum', name: 'HResist', values: [...resistValues], asChips: true, labels: resistLabels, dots: true, colors: resistColors } },
      { kind: 'child', element: 'EquipEffect', name: 'SBResist', label: '斩击混乱抗性', field: { kind: 'enum', name: 'SBResist', values: [...resistValues], asChips: true, labels: resistLabels, dots: true, colors: resistColors } },
      { kind: 'child', element: 'EquipEffect', name: 'PBResist', label: '突刺混乱抗性', field: { kind: 'enum', name: 'PBResist', values: [...resistValues], asChips: true, labels: resistLabels, dots: true, colors: resistColors } },
      { kind: 'child', element: 'EquipEffect', name: 'HBResist', label: '打击混乱抗性', field: { kind: 'enum', name: 'HBResist', values: [...resistValues], asChips: true, labels: resistLabels, dots: true, colors: resistColors } },
      { kind: 'child', element: 'EquipEffect', name: 'MaxPlayPoint', label: '最大光芒', field: { kind: 'int', name: 'MaxPlayPoint', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'StartPlayPoint', label: '初始光芒', field: { kind: 'int', name: 'StartPlayPoint', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'AddedStartDraw', label: '初始抽牌', field: { kind: 'int', name: 'AddedStartDraw', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'OnlyCard', label: '专属卡牌', field: { kind: 'multi', name: 'OnlyCard' } },
      { kind: 'child', element: 'EquipEffect', name: 'CustomOnlyCard', label: '自定义专属卡牌', field: { kind: 'multi', name: 'CustomOnlyCard' } },
      { kind: 'child', element: 'EquipEffect', name: 'Passive', label: '被动', field: { kind: 'multi', name: 'Passive' } },
      { kind: 'text', name: 'CharacterSkin', label: '皮肤' },
      { kind: 'text', name: 'CharacterSkinType', label: '皮肤类型' },
      { kind: 'text', name: 'SkinGender', label: '皮肤性别' },
      {
        kind: 'enum',
        name: 'Chapter',
        label: '章节',
        values: ['1', '2', '3', '4', '5', '6', '7'],
        asChips: true,
        noIdToggle: true,
        allowCustom: true,
        customNumeric: true,
        labels: chapterLabels,
        icons: { '1': 'ch1', '2': 'ch2', '3': 'ch3', '4': 'ch4', '5': 'ch5', '6': 'ch6', '7': 'ch7' }
      },
      { kind: 'int', name: 'SpeedDiceNum', label: '速度骰子数', digitsOnly: true },
      { kind: 'bool', name: 'NotEquip', label: '不可装备' },
      { kind: 'bool', name: 'RandomFace', label: '随机立绘' },
      { kind: 'int', name: 'SuccessionPossibleNumber', label: '继承次数', digitsOnly: true },
      { kind: 'text', name: 'Category', label: '类别', omitWhenEmpty: true }
    ]
  }
}

/** 敌人核心书页：Data/EquipPage_Enemy.xml */
export const equipPageEnemyModule: ModuleDefinition = {
  id: 'equippage-enemy',
  title: '敌人核心',
  icon: 'Skull',
  description: '敌人核心书页（EquipPage_Enemy.xml）',
  dataFile: 'EquipPage_Enemy.xml',
  entity: bookEntity()
}

/** 玩家核心书页：Data/EquipPage_Librarian.xml */
export const equipPageLibrarianModule: ModuleDefinition = {
  id: 'equippage-librarian',
  title: '玩家核心',
  icon: 'User',
  description: '玩家核心书页（EquipPage_Librarian.xml）',
  dataFile: 'EquipPage_Librarian.xml',
  entity: bookEntity()
}

/** 书页故事：本地化驱动（BookStory.xml 与 Localize/Books 共用 BookDescRoot），按语言切换文档 */
export const bookStoryModule: ModuleDefinition = {
  id: 'bookstory',
  title: '书页故事',
  icon: 'BookOpen',
  description: '核心书页名称与故事（多语言）',
  entity: {
    root: 'BookDescRoot',
    entity: 'BookDesc',
    idAttr: 'BookID',
    containerPath: ['bookDescList'],
    displayField: 'BookName',
    idNumeric: true,
    quickFields: ['BookName'],
    fields: [
      { kind: 'text', name: 'BookName', label: '书页名称', required: true },
      { kind: 'child', element: 'TextList', name: 'Desc', label: '故事描述', field: { kind: 'multiline', name: 'Desc', multiLineElements: true } }
    ]
  },
  localizeRoots: [
    {
      root: 'BookDescRoot',
      containerPath: ['bookDescList'],
      entity: 'BookDesc',
      idAttr: 'BookID',
      fields: [
        { name: 'BookName', label: '书页名称' },
        { name: 'Desc', label: '故事描述', kind: 'multiline' }
      ]
    }
  ]
}