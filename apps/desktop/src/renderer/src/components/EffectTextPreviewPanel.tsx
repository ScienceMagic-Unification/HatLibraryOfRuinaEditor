import type { EntityRef } from '@ruina/editor-core'
import { getTextField } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { RegexText } from './RegexText'
import { useRegexRules } from '../lib/useRegexRules'
import { useAppStore } from '../store'
import { resolveBuiltinIconUrl } from '../lib/builtinIcons'

/** 效果文本右侧预览：Name / Desc；若存在对应模组正则词条，则显示词条图标并用词条颜色渲染名称。 */
export function EffectTextPreviewPanel({ entity }: { entity: EntityRef | null }): JSX.Element {
  const { t } = useI18n()
  const rules = useRegexRules()
  const buffIcons = useAppStore((s) => s.buffIcons)
  const name = entity ? getTextField(entity.node, 'Name') ?? '' : ''
  const desc = entity ? getTextField(entity.node, 'Desc') ?? '' : ''

  const entry = entity ? rules.get(entity.id) : undefined
  const icon = entry ? resolveBuiltinIconUrl(entry.keywordIconId, buffIcons) : undefined
  const color = entry?.color

  return (
    <div className="space-y-3 p-3">
      <div className="text-xs font-medium text-muted-foreground">{t('descPreview')}</div>
      {!entity ? (
        <div className="text-center text-xs text-muted-foreground">{t('preview.empty')}</div>
      ) : (
        <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
          <div className="flex items-center gap-2.5">
            {icon ? <img src={icon} alt="" className="size-5 shrink-0 object-contain" draggable={false} /> : null}
            <span className="text-base font-semibold" style={color ? { color } : undefined}>{name || t('unnamed')}</span>
          </div>
          <div className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-foreground/90">
            {desc ? <RegexText text={desc} rules={rules} scope="all" /> : t('empty')}
          </div>
        </div>
      )}
    </div>
  )
}
