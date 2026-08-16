import type { EntityRef } from '@ruina/editor-core'
import { getTextField } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { RegexText } from './RegexText'
import { useRegexRules } from '../lib/useRegexRules'

/** 名称与描述工作区：描述输入下方的预览，支持校对预览富文本。 */
export function PassiveAbilityPreviewPanel({ entity }: { entity: EntityRef | null }): JSX.Element {
  const { t } = useI18n()
  const rules = useRegexRules()
  const name = entity ? getTextField(entity.node, 'Name') ?? '' : ''
  const desc = entity ? getTextField(entity.node, 'Desc') ?? '' : ''

  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{t('descPreview')}</div>
      {!entity ? (
        <div className="text-center text-xs text-muted-foreground">{t('preview.empty')}</div>
      ) : (
        <div className="space-y-2">
          <div className="text-base font-semibold">{name || t('unnamed')}</div>
          <div className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-foreground/90">
            {desc ? <RegexText text={desc} rules={rules} scope="passive" /> : t('empty')}
          </div>
        </div>
      )}
    </div>
  )
}