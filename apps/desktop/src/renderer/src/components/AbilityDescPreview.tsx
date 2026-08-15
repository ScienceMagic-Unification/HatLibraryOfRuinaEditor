import type { EntityRef, ModuleDefinition } from '@ruina/editor-core'
import { getFieldValue } from '@ruina/editor-core'
import { AbilityText } from './AbilityText'
import { useI18n } from '../i18n'

/** 书页能力工作区右侧预览：当前能力描述（多行 Desc 合并显示） */
export function AbilityDescPreview({
  module,
  entity
}: {
  module: ModuleDefinition
  entity: EntityRef | null
}): JSX.Element {
  const { t } = useI18n()
  const descField = module.entity.fields.find((f) => f.name === 'Desc')
  const desc = entity && descField ? ((getFieldValue(entity.node, descField) as string) ?? '') : ''
  return (
    <div className="p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{t('abilityPreview')}</div>
      <div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/20 p-3 text-xs leading-relaxed text-foreground/90">
        {desc ? <AbilityText text={desc} /> : '（空）'}
      </div>
    </div>
  )
}