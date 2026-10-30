import { text, number, rows } from './workspaces'
import type { ModuleDefinition } from '@ruina/editor-core'

/** EnemyUnitClassRoot: BaseMod enemy data. */
export const enemyModule: ModuleDefinition = {
  id: 'enemy',
  title: '敌人 Enemy',
  icon: 'Skull',
  description: '敌人单位基础数据',
  dataRoot: 'EnemyUnitClassRoot',
  overview: true,
  entity: {
    root: 'EnemyUnitClassRoot',
    entity: 'Enemy',
    idAttr: 'ID',
    idNumeric: true,
    displayField: 'Name',
    quickFields: ['NameID', 'BookId', 'DeckId', 'AiScript', 'DropTable'],
    fields: [
      { kind: 'text', name: 'Name', label: '名称', omitWhenEmpty: true },
      { kind: 'text', name: 'FaceType', label: '立绘类型' },
      { kind: 'int', name: 'NameID', label: '名称 ID' },
      { kind: 'int', name: 'MinHeight', label: '最小高度' },
      { kind: 'int', name: 'MaxHeight', label: '最大高度' },
      { kind: 'text', name: 'Gender', label: '性别' },
      rows('BookId', '核心书页', [], [text('Pid', '模组 ID')], number('value', '书页 ID')),
      { kind: 'int', name: 'BodyId', label: '身体 ID' },
      { kind: 'int', name: 'Exp', label: '经验', min: 0 },
      text('DropBonus', '掉落加成'),
      text('AiScript', 'AI 脚本'), number('DeckId', '卡组 ID'),
      rows('Emotion', '情感书页', [], [text('State', '情感状态'), number('Level', '情感等级')], number('value', '异想体书页 ID')),
      rows('DropTable', '掉落表', [rows('DropItem', '掉落项目', [], [text('Prob', '权重'), text('Pid', '模组 ID')], number('value', '书籍 ID'))], [number('Level', '情感等级')]),
      { kind: 'bool', name: 'Retreat', label: '可撤退' },
      { kind: 'bool', name: 'Unknown', label: '未知身份' }
    ]
  }
}
