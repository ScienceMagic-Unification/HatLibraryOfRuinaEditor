import type { FieldDef, ListFieldDef, ModuleDefinition, ScalarFieldDef } from '@ruina/editor-core'

// Shapes audited against BaseMod/StaticInfo and BaseMod/Localize/cn.
// References remain ordered rows: duplicate cards and units are meaningful.
export const text = (name: string, label = name): ScalarFieldDef => ({ kind: 'text', name, label, omitWhenEmpty: true })
export const number = (name: string, label = name): ScalarFieldDef => ({ kind: 'int', name, label, optional: true, omitWhenEmpty: true })
const flag = (name: string, label: string): FieldDef => ({ kind: 'bool', name, label })
const multiline = (name: string, label: string): ScalarFieldDef => ({ kind: 'multiline', name, label })
export const rows = (name: string, label: string, fields: FieldDef[] = [], attrs: ScalarFieldDef[] = [], textField?: ScalarFieldDef): ListFieldDef => ({ kind: 'list', name, item: name, direct: true, label, attrs, fields, textField })
const refs = (name: string, label: string) => rows(name, label, [], [text('Pid', '模组 ID')], number('value', 'ID'))
const child = (element: string, field: ScalarFieldDef): FieldDef => ({ kind: 'child', name: `${element}.${field.name}`, label: field.label, element, field })
const floor = (name = 'Sephirah', label = '楼层'): ScalarFieldDef => ({ kind: 'enum', name, label, omitWhenEmpty: true, asChips: true, allowCustom: true, values: ['Malkuth', 'Yesod', 'Hod', 'Netzach', 'Tiphereth', 'Gebura', 'Chesed', 'Binah', 'Hokma', 'Keter'] })
function data(id: string, title: string, root: string, entity: string, fields: FieldDef[], quickFields: string[], idAttr = 'ID'): ModuleDefinition {
  return { id, title, icon: 'BookOpen', dataRoot: root, overview: true, entity: { root, entity, idAttr, idNumeric: true, idOnlyList: !fields.some((f) => f.name === 'Name'), fields, quickFields, displayField: 'Name' } }
}
function localize(id: string, title: string, root: string, entity: string, fields: FieldDef[], idAttr = 'ID'): ModuleDefinition {
  return { id, title, icon: 'FileText', overview: true, entity: { root, entity, idAttr, idOnlyList: true, fields, quickFields: fields.map((f) => f.name) }, localizeRoots: [{ root, entity, idAttr, fields: [] }] }
}

export const stageModule = data('stage', '接待', 'StageXmlRoot', 'Stage', [
  text('Name', '名称'), number('Chapter', '章节'), number('FloorNum', '可用楼层数'), text('StageType', '接待类型'), text('StoryType', '剧情类型'), flag('invitationtype', '固定普通邀请'),
  rows('Wave', '波次', [number('Formation', '阵型 ID'), text('FormationType', '排列方式'), number('AvailableUnit', '出战人数'), text('ManagerScript', '战斗脚本'), text('AggroScript', '仇恨脚本'), refs('Unit', '敌人单位')]),
  { kind: 'attrs', name: 'Invitation', label: '邀请条件', attrs: [text('Combine', '组合方式')] },
  child('Invitation', number('Num', '邀请书籍数量')), child('Invitation', text('Value', '邀请书籍价值')),
  { kind: 'list', name: 'Invitation', item: 'Book', label: '邀请书籍', attrs: [text('Pid', '模组 ID')], textField: number('value', '书籍 ID') },
  { kind: 'list', name: 'Condition', item: 'Stage', label: '前置接待', attrs: [text('Pid', '模组 ID')], textField: number('value', '接待 ID') },
  rows('Story', '剧情', [], [text('Condition', '触发条件')], text('value', '剧情 ID')),
  rows('RewardItems', '奖励', [], [text('Type', '奖励类型')], number('value', 'ID')),
  { kind: 'multi', name: 'MapInfo', label: '地图' }, { kind: 'multi', name: 'FloorOnly', label: '限定楼层', values: (floor() as Extract<ScalarFieldDef, { kind: 'enum' }>).values }, { kind: 'multi', name: 'ExceptFloor', label: '排除楼层' }, flag('IsChapterLast', '章节终战')
], ['Name', 'Chapter', 'FloorNum', 'Wave'], 'id')
export const deckModule = data('deck', '卡组', 'DeckXmlRoot', 'Deck', [refs('Card', '战斗书页')], ['Card'])
export const dropBookModule = data('dropbook', '掉落书籍', 'BookUseXmlRoot', 'BookUse', [
  text('Name', '名称'), number('Text', '原版文本 ID'), text('TextId', '文本 ID'), number('Episode', '接待 ID'), text('BookIcon', '书籍图标'), number('Chapter', '章节'), number('Exp', '经验'), text('EquipProb', '核心书页概率'), number('BookValue', '书籍价值'), number('DropNum', '掉落数量'), text('DropItemState', '掉落状态'),
  rows('DropItem', '掉落项目', [], [text('Type', '掉落类型'), text('Pid', '模组 ID')], number('value', 'ID'))
], ['TextId', 'BookIcon', 'DropItem'])
export const cardDropModule = data('carddrops', '书页掉落表', 'CardDropTableXmlRoot', 'DropTable', [refs('Card', '战斗书页')], ['Card'])
export const emotionCardModule = data('emotioncard', '异想体书页', 'EmotionCardXmlRoot', 'EmotionCard', [
  text('Name', '文本 ID'), text('Artwork', '卡图资源'), floor(), text('State', '情感类型'), number('Level', '层级'), number('EmotionLevel', '情感等级'), number('EmotionRate', '情感比率'), text('TargetType', '目标类型'), { kind: 'multi', name: 'Script', label: '能力脚本' }, flag('Locked', '锁定'), flag('PlayerOnly', '仅司书')
], ['Name', 'Sephirah', 'Level', 'Script'])
export const emotionEgoModule = data('emotionego', '楼层 E.G.O', 'EmotionEgoXmlRoot', 'EmotionEgo', [floor(), number('Card', '战斗书页 ID'), flag('LockInBattle', '战斗中锁定')], ['Sephirah', 'Card'])
export const giftModule = data('gift', '饰品', 'GiftXmlRoot', 'Gift', [
  text('Name', '文本 ID'), text('Resource', '资源'), text('Position', '佩戴位置'), number('Count', '数量'), rows('Passive', '被动能力', [], [], number('value', '被动 ID')), child('Stat', number('HP', '生命加成')), child('Stat', number('Break', '混乱加成')), flag('NoAppear', '隐藏外观')
], ['Name', 'Resource', 'Position', 'Passive'])
export const formationModule = data('formation', '阵型', 'FormationXmlRoot', 'Formation', [
  text('Name', '名称'), number('Unlock', '解锁条件'), rows('Position', '站位', [text('Name', '名称'), { kind: 'attrs', name: 'Vector', label: '坐标', attrs: [text('x', 'X'), text('y', 'Y')] }])
], ['Name', 'Position'])
export const namesModule = localize('character-stage-names', '角色与接待名称', 'CharactersNameRoot', 'Name', [{ ...text('Text', '名称'), selfText: true }])
namesModule.entity.displayField = 'Text'
namesModule.entity.idOnlyList = false
namesModule.entity.idNumeric = true
export const abnormalityTextModule = localize('abnormalitytext', '异想体书页文本', 'AbnormalityCardsRoot', 'Sephirah', [
  rows('AbnormalityCard', '异想体书页', [text('Abnormality', '异想体'), text('CardName', '书页名称'), multiline('AbilityDesc', '能力描述'), multiline('FlaborText', '背景文本'), { kind: 'list', name: 'Dialogues', item: 'Dialogue', label: '对白', attrs: [text('ID')], textField: multiline('value', '文本') }], [text('ID')])
], 'SephirahType')
export const abnormalityAbilityModule = localize('abnormalityability', '异想体能力文本', 'AbnormalityAbilityRoot', 'Abnormality', [
  { kind: 'list', name: 'AbilityList', item: 'Ability', label: '能力描述', attrs: [], textField: multiline('value', '文本') }
])
export const giftTextModule = localize('gifttext', '饰品文本', 'GiftTextRoot', 'GiftText', [multiline('Desc', '描述'), text('Prefix', '前缀'), text('Postfix', '后缀'), multiline('AcquireCondition', '获取条件')])
export const battleDialogModule = localize('battledialog', '战斗对白', 'BattleDialogRoot', 'Character', [
  rows('Type', '触发事件', [rows('BattleDialog', '对白', [], [text('ID')], multiline('value', '文本'))], [text('ID', '事件 ID')])
])
battleDialogModule.documentFields = [text('GroupName', '对白组')]
export const dialogRelationModule = localize('dialogrelation', '核心书页对白关联', 'BattleDialogRelationRoot', 'Relation', [text('GroupName', '对白组'), text('CharacterID', '角色 ID')], 'BookID')
dialogRelationModule.entity.idNumeric = true

export const workspaceModules = [stageModule, deckModule, dropBookModule, cardDropModule, emotionCardModule, emotionEgoModule, giftModule, formationModule, namesModule, abnormalityTextModule, abnormalityAbilityModule, giftTextModule, battleDialogModule, dialogRelationModule]
