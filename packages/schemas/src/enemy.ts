import type { ModuleDefinition } from '@ruina/editor-core'

/** 敌人模块：数据区 EnemyUnitInfo.xml（暂无本地化与预览，演示纯数据模块） */
export const enemyModule: ModuleDefinition = {
  id: 'enemy',
  title: '敌人 Enemy',
  icon: 'Skull',
  description: '敌人单位基础数据',
  dataRoot: 'EnemyUnitClassRoot',
  entity: {
    root: 'EnemyUnitClassRoot',
    entity: 'Enemy',
    idAttr: 'ID',
    displayField: 'Name',
    quickFields: ['Name', 'Gender', 'BookId'],
    fields: [
      { kind: 'text', name: 'Name', label: '名称', required: true },
      { kind: 'text', name: 'FaceType', label: '立绘类型' },
      { kind: 'int', name: 'NameID', label: '名称 ID' },
      { kind: 'int', name: 'MinHeight', label: '最小高度' },
      { kind: 'int', name: 'MaxHeight', label: '最大高度' },
      { kind: 'text', name: 'Gender', label: '性别' },
      { kind: 'int', name: 'BookId', label: '书页 ID' },
      { kind: 'int', name: 'BodyId', label: '身体 ID' },
      { kind: 'int', name: 'Exp', label: '经验', min: 0 },
      { kind: 'int', name: 'DropBonus', label: '掉落加成', min: 0 },
      { kind: 'marker', name: 'AiScript', label: 'AI 脚本' }
    ]
  }
}
