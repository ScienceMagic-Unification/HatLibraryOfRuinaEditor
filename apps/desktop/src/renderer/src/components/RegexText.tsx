import { Fragment, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import type { BattleEffectTextEntry } from '../lib/previewRules'
import { resolveBuiltinIconUrl } from '../lib/builtinIcons'
import { parseKeywordPreview, type KeywordScope, type PreviewNode } from '../lib/keywordPreview'
import type { DicePreviewContext } from '../lib/diceApplicability'

export function RegexText({ text, rules, scope = 'ability', extraIcons, diceAbilityIds, diceContext }: {
  text: string; rules: Map<string, BattleEffectTextEntry>; scope?: KeywordScope; extraIcons?: Record<string, string>; diceAbilityIds?: readonly string[]; diceContext?: DicePreviewContext
}): JSX.Element {
  const buffIcons = useAppStore((s) => s.buffIcons)
  const hatEnabled = useAppStore((s) => s.hatEnabled)
  const { t } = useI18n()
  const extra = extraIcons ?? buffIcons
  const parsed = useMemo(() => parseKeywordPreview(text, rules, scope, hatEnabled, diceAbilityIds, diceContext), [text, rules, scope, hatEnabled, diceAbilityIds, diceContext])
  const warnings = parsed.diagnostics.map((d) => `${t(`keyword.warning.${d.code}`)}: ${d.detail}`)
  function render(nodes: PreviewNode[]): ReactNode[] {
    return nodes.map((node, i) => {
      if (typeof node === 'string') return node
      const e = node.entry
      const children = render(node.children)
      if (node.tag.startsWith('HatKeyword') || node.tag === 'sprite') {
        const iconId = e?.iconName || e?.keywordIconId || node.value
        const icon = resolveBuiltinIconUrl(iconId, extra, e?.plugin, e?.iconSheetName)
        const iconOnly = node.tag === 'HatKeywordIcon' || node.tag === 'sprite'
        if (!icon && (iconOnly || e?.iconName || e?.keywordIconId)) warnings.push(`${t('keyword.warning.icon')}: ${e?.iconSheetName ? e.iconSheetName + '/' : ''}${iconId}`)
        const style: CSSProperties = { color: e?.color || undefined, fontWeight: e?.isBold ? 700 : undefined, fontStyle: e?.isItalic ? 'italic' : undefined, textDecoration: e?.isUnderline ? 'underline' : undefined, whiteSpace: node.parameter !== undefined ? 'pre-wrap' : undefined }
        return <span key={i} style={style} title={[e?.id || node.value, e?.plugin, e?.desc].filter(Boolean).join('\n')} data-keyword-id={node.value} data-keyword-link={node.tag === 'HatKeywordLink' || e?.isAutoLink || undefined}>
          {icon ? <img src={icon} alt="" className="inline-block size-4 shrink-0 object-contain align-[-3px]" draggable={false} /> : iconOnly ? <span className="text-amber-400">[{iconId}]</span> : null}
          {iconOnly ? null : children}
        </span>
      }
      const style: CSSProperties = {}
      if (node.tag === 'color') style.color = node.value
      if (node.tag === 'b') style.fontWeight = 700
      if (node.tag === 'i') style.fontStyle = 'italic'
      if (node.tag === 'u') style.textDecoration = 'underline'
      if (node.tag === 's' || node.tag === 'strikethrough') style.textDecoration = 'line-through'
      if (node.tag === 'mark') style.backgroundColor = node.value || '#ffff0066'
      if (node.tag === 'size' && /^\d+(?:\.\d+)?(?:%|px|em)?$/.test(node.value || '')) style.fontSize = /^\d+(?:\.\d+)?$/.test(node.value!) ? `${node.value}px` : node.value
      if (node.tag === 'sub' || node.tag === 'sup') { style.verticalAlign = node.tag === 'sup' ? 'super' : 'sub'; style.fontSize = '0.75em' }
      if (node.tag === 'nobr') style.whiteSpace = 'nowrap'
      if (node.tag === 'uppercase' || node.tag === 'lowercase') style.textTransform = node.tag
      if (node.tag === 'smallcaps') style.fontVariant = 'small-caps'
      return <span key={i} style={style} title={node.tag === 'link' ? node.value : undefined}>{children}</span>
    })
  }
  const nodes = render(parsed.nodes)
  return <Fragment>{nodes}{warnings.length > 0 ? <span className="ml-1 cursor-help text-amber-400" role="note" title={[...new Set(warnings)].join('\n')} aria-label={[...new Set(warnings)].join('\n')}>⚠</span> : null}</Fragment>
}
