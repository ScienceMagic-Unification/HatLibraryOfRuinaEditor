import type { EntityRef } from '@ruina/editor-core'
import { getTextField } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { RegexText } from './RegexText'
import { useRegexRules } from '../lib/useRegexRules'

/** 效果文本右侧预览：仅展示当前 BattleEffectTextExtra 的 Name / Desc。 */
export function EffectTextPreviewPanel({ entity }: { entity: EntityRef | null }): JSX.Element {
  const { t } = useI18n()
  const rules = useRegexRules()
  const name = entity ? getTextField(entity.node, 'Name') ?? '' : ''
  const desc = entity ? getTextField(entity.node, 'Desc') ?? '' : ''

  return (
    <div className="space-y-3 p-3">
      <div className="text-xs font-medium text-muted-foreground">{t('descPreview')}</div>
      {!entity ? (
        <div className="text-center text-xs text-muted-foreground">{t('preview.empty')}</div>
      ) : (
        <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
          <div className="text-base font-semibold">{name || t('unnamed')}</div>
          <div className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-foreground/90">
            {desc ? <RegexText text={desc} rules={rules} scope="all" /> : t('empty')}
          </div>
        </div>
      )}
    </div>
  )
}