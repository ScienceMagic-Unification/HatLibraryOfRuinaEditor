import { type ReactNode } from 'react'
import type { EntityRef } from '@ruina/editor-core'
import { getTextField, listEntities } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { RegexText } from './RegexText'
import { useRegexRules } from '../lib/useRegexRules'
import { useAppStore } from '../store'
import { cardAccent } from '../lib/cardAccent'
import type { BattleEffectTextEntry } from '../lib/previewRules'

interface RichStyle {
  italic: boolean
  bold: boolean
  underline: boolean
  color?: string
}

const styleOf = (s: RichStyle): React.CSSProperties => ({
  color: s.color || undefined,
  fontWeight: s.bold ? 700 : undefined,
  fontStyle: s.italic ? 'italic' : undefined,
  textDecoration: s.underline ? 'underline' : undefined
})

/** 解析名称中的简单 XML 富文本：<i>/<b>/<u>/<color=#RRGGBB>，颜色覆盖稀有度颜色。 */
function renderRichName(text: string, baseColor?: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const stack: RichStyle[] = [{ italic: false, bold: false, underline: false, color: baseColor }]
  const top = (): RichStyle => stack[stack.length - 1]
  const re = /<(\/?)(color|i|b|u)(?:=#([0-9A-Fa-f]{3,8}))?>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) {
      nodes.push(<span key={last} style={styleOf(top())}>{text.slice(last, m.index)}</span>)
    }
    const closing = m[1] === '/'
    const tag = m[2]
    const hex = m[3]
    if (closing) {
      if (stack.length > 1) stack.pop()
    } else if (tag === 'i') {
      stack.push({ ...top(), italic: true })
    } else if (tag === 'b') {
      stack.push({ ...top(), bold: true })
    } else if (tag === 'u') {
      stack.push({ ...top(), underline: true })
    } else if (tag === 'color' && hex) {
      stack.push({ ...top(), color: '#' + hex })
    }
    last = re.lastIndex
  }
  if (last < text.length) {
    nodes.push(<span key={last} style={styleOf(top())}>{text.slice(last)}</span>)
  }
  return nodes
}

export function PassiveName({ name, accent }: { name: string; accent?: string }): JSX.Element {
  return <>{renderRichName(name, accent)}</>
}

/** Shared passive typography for the passive workspace and referenced passives. */
export function PassivePreviewContent({ name, desc, cost = '', accent, rules }: {
  name: string; desc: string; cost?: string; accent?: string; rules: Map<string, BattleEffectTextEntry>
}): JSX.Element {
  const { t } = useI18n()
  return <div className="space-y-2" data-testid="passive-preview-content">
    <div className="flex items-center gap-3">
      {cost !== '' ? <span className="shrink-0 text-base font-semibold" style={accent ? { color: accent } : undefined}>{cost}</span> : null}
      <span className="text-base font-semibold"><PassiveName name={name || t('unnamed')} accent={accent}/></span>
    </div>
    <div className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-foreground/90">
      {desc ? <RegexText text={desc} rules={rules} scope="passive"/> : t('empty')}
    </div>
  </div>
}

/** 名称与描述工作区：描述输入下方的预览，支持校对预览富文本。 */
export function PassiveAbilityPreviewPanel({ entity }: { entity: EntityRef | null }): JSX.Element {
  const { t } = useI18n()
  const rules = useRegexRules()
  const modules = useAppStore((s) => s.modules)
  const docs = useAppStore((s) => s.docs)
  const name = entity ? getTextField(entity.node, 'Name') ?? '' : ''
  const desc = entity ? getTextField(entity.node, 'Desc') ?? '' : ''

  const passiveModule = modules.find((m) => m.id === 'passive')
  const passiveDoc = Object.values(docs).find((d) => d.bindings['passive']?.kind === 'primary')
  const passiveRef = entity && passiveModule && passiveDoc
    ? listEntities(passiveDoc.doc, passiveModule.entity).find((r) => r.id === entity.id)
    : undefined
  const accent = passiveRef ? cardAccent(passiveRef.node) : undefined
  const cost = passiveRef ? (getTextField(passiveRef.node, 'Cost') ?? '') : ''

  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
      <div className="text-xs font-medium text-muted-foreground">{t('descPreview')}</div>
      {!entity ? (
        <div className="text-center text-xs text-muted-foreground">{t('preview.empty')}</div>
      ) : (
        <PassivePreviewContent name={name} desc={desc} cost={cost} accent={accent} rules={rules}/>
      )}
    </div>
  )
}
