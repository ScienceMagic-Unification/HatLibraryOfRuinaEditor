import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { useRegexRules } from '../lib/useRegexRules'
import { keywordSearchAliases } from '../lib/keywordMigrations'
import { useI18n } from '../i18n'
import { KeywordPicker } from './KeywordPicker'
import { numericKeywordIds } from '../lib/keywordAggregation'
import { keywordMarkup } from '../lib/keywordPreview'

interface Suggestion {
  id: string
  label: string
}

const WORD = /[\p{L}\p{N}_]/u

function tokenAt(value: string, caret: number): { token: string; start: number } {
  let start = caret
  while (start > 0 && WORD.test(value[start - 1])) start -= 1
  return { token: value.slice(start, caret), start }
}

function completionFor(id: string, kind: 'hat' | 'icon', wrapped: boolean): { text: string; cursor: number } {
  if (kind === 'icon') {
    const text = `(~HatKeywordIcon id="${id}"/~)`
    return { text, cursor: text.length }
  }
  if (wrapped) {
    const open = `(~HatKeyword id="${id}"~)`
    const close = `(~/HatKeyword~)`
    return { text: open + close, cursor: open.length }
  }
  if (numericKeywordIds.some((key) => key === id)) {
    const text = keywordMarkup(id, 'hat', undefined, '')
    return { text, cursor: text.indexOf('value="') + 7 }
  }
  const text = `(~HatKeyword id="${id}"/~)`
  return { text, cursor: text.length }
}

/** 自动增高描述框：保留最小行数，内容变多时向下扩展；开启「正则补全」后，输入奇点/Mod 关键词前缀会提示补全。 */
export function AutoTextarea({
  value,
  onChange,
  rows = 4,
  className = '',
  placeholder,
  disabled = false,
  readOnly = false,
  language
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  className?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  language?: string
}): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null)
  const pendingCursor = useRef<number | null>(null)
  const [query, setQuery] = useState('')
  const [tokenStart, setTokenStart] = useState(0)
  const [open, setOpen] = useState(false)
  const [wrapped, setWrapped] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const selection = useRef({ start: 0, end: 0 })
  const hatEnabled = useAppStore((s) => s.hatEnabled)

  const regexAutocomplete = useAppStore((s) => s.regexAutocomplete)
  const rules = useRegexRules(language)
  const { t } = useI18n()

  const enabled = regexAutocomplete && !disabled && !readOnly && rules.size > 0

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  useEffect(() => {
    if (pendingCursor.current === null || !ref.current) return
    ref.current.focus()
    ref.current.setSelectionRange(pendingCursor.current, pendingCursor.current)
    pendingCursor.current = null
  }, [value])

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const ranked = Array.from(rules.values())
      .map((e) => {
        const id = e.id.toLowerCase()
        const rec = (e.recognizeName || '').toLowerCase()
        const name = (e.name || '').toLowerCase()
        let rank = -1
        if (id.startsWith(q)) rank = 0
        else if (rec.startsWith(q)) rank = 1
        else if (name.startsWith(q)) rank = 2
        else if (id.includes(q) || rec.includes(q) || name.includes(q) || e.plugin?.toLowerCase().includes(q) || keywordSearchAliases(e.id).some((alias) => alias.toLowerCase().includes(q))) rank = 3
        return { e, rank }
      })
      .filter((x) => x.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.e.id.localeCompare(b.e.id))
    const seen = new Set<string>()
    const out: Suggestion[] = []
    for (const x of ranked) {
      if (seen.has(x.e.id)) continue
      seen.add(x.e.id)
      out.push({ id: x.e.id, label: x.e.name || x.e.recognizeName || x.e.id })
      if (out.length >= 30) break
    }
    return out
  }, [query, rules])

  const insert = (id: string, kind: 'hat' | 'icon'): void => {
    const { text, cursor } = completionFor(id, kind, wrapped)
    const caret = ref.current?.selectionStart ?? value.length
    onChange(value.slice(0, tokenStart) + text + value.slice(caret))
    pendingCursor.current = tokenStart + cursor
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative">
      {hatEnabled && !disabled && !readOnly ? <div className="mb-1 flex justify-end"><button type="button" className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent" onMouseDown={(e) => e.preventDefault()} onClick={() => {
        selection.current = { start: ref.current?.selectionStart ?? value.length, end: ref.current?.selectionEnd ?? value.length }
        setOpen(false)
        setPickerOpen(true)
      }}>{t('keyword.library')}</button></div> : null}
      {pickerOpen ? <KeywordPicker rules={rules} selectedText={value.slice(selection.current.start, selection.current.end)} onClose={() => { setPickerOpen(false); ref.current?.focus() }} onInsert={(text) => {
        const { start, end } = selection.current
        pendingCursor.current = start + text.length
        onChange(value.slice(0, start) + text + value.slice(end))
      }} /> : null}
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly || disabled}
        onChange={(e) => {
          const el = e.currentTarget
          const caret = el.selectionStart ?? el.value.length
          onChange(el.value)
          if (!enabled) {
            setOpen(false)
            setQuery('')
            return
          }
          const { token, start } = tokenAt(el.value, caret)
          const prev = el.value[start - 1]
          if (token && prev !== '"' && prev !== '=') {
            setTokenStart(start)
            setQuery(token)
            setHighlight(0)
            setOpen(true)
          } else {
            setQuery('')
            setOpen(false)
          }
        }}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(0, h - 1))
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            const s = suggestions[highlight]
            if (s) insert(s.id, 'hat')
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
            setQuery('')
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      />
      {enabled && open && suggestions.length > 0 ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          <div className="max-h-56 overflow-y-auto overscroll-contain">
            {suggestions.map((s, i) => (
              <div
                key={s.id}
                onMouseEnter={() => setHighlight(i)}
                className={`flex items-center gap-1.5 px-2 py-1 ${i === highlight ? 'bg-accent' : ''}`}
              >
                <div className="min-w-0 flex-1 truncate px-1 text-xs">
                  <span className="font-mono text-foreground/90">{s.id}</span>
                  {s.label && s.label !== s.id ? <span className="ml-1.5 text-muted-foreground">{s.label}</span> : null}
                </div>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(s.id, 'hat')} className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground/80 hover:bg-accent">HatKeyword</button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(s.id, 'icon')} className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground/80 hover:bg-accent">Icon</button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end border-t border-border bg-muted/40 px-2 py-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setWrapped((v) => !v)}
              className={`rounded-md border px-2 py-0.5 text-[10px] transition-colors ${wrapped ? 'border-primary/60 bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}
            >
              {t('regexAutocomplete.wrap')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
