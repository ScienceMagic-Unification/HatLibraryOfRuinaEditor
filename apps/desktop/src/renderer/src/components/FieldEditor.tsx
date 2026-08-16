import { useState } from 'react'
import type { FieldDef, ScalarFieldDef } from '@ruina/editor-core'
import { getAttr, makeElement, setAttr } from '@ruina/editor-core'
import { Badge, Button, Input, Label, Select, Textarea } from '@ruina/ui'
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import { resolveIconUrl } from '../lib/rangeIcons'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { AutocompleteInput } from './AutocompleteInput'
import { AutoTextarea } from './AutoTextarea'

function FieldLabel({ label, required, help }: { label: string; required?: boolean; help?: string }): JSX.Element {
  return (
    <Label className={help ? 'cursor-help' : undefined} title={help}>
      {label}
      {required ? <span className="ml-0.5 text-red-400">*</span> : null}
    </Label>
  )
}

function ScalarEditor({
  field,
  value,
  onChange,
  compact,
  accentColor,
  showIds
}: {
  field: ScalarFieldDef
  value: string
  onChange: (v: string) => void
  compact?: boolean
  accentColor?: string
  showIds?: boolean
}): JSX.Element {
  const { t, tl } = useI18n()
  if (field.kind === 'enum' && field.asChips) {
    const current = field.values.includes(value) ? value : ''
    const customActive = Boolean(field.allowCustom) && !field.values.includes(value)
    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {field.values.map((v) => {
            const label = showIds ? v : tl(field.labels?.[v] ?? v)
            const color = field.colors?.[v]
            const active = value === v
            const icon = resolveIconUrl(field.icons?.[v])
            const activeColor = accentColor ?? color
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange(v)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active ? 'bg-accent/60' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-accent/40'
                }`}
                style={active && activeColor ? { borderColor: activeColor, color: activeColor, backgroundColor: activeColor + '26' } : undefined}
              >
                {field.dots && color ? <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} /> : null}
                {icon ? <img src={icon} alt={label} className="size-5 object-contain" draggable={false} /> : null}
                {label}
              </button>
            )
          })}
          {field.allowCustom ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                customActive ? 'bg-accent/60' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-accent/40'
              }`}
              style={customActive && accentColor ? { borderColor: accentColor, color: accentColor, backgroundColor: accentColor + '26' } : undefined}
            >
              {showIds ? 'custom' : t('custom')}
            </button>
          ) : null}
        </div>
        {customActive ? (
          <Input
            type="text"
            inputMode={field.customNumeric ? 'numeric' : undefined}
            value={value}
            onChange={(e) => onChange(field.customNumeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
            placeholder={field.placeholder ?? (field.customNumeric ? t('inputNumber') : undefined)}
            className={field.widthClass ?? 'w-32'}
          />
        ) : null}
      </div>
    )
  }
  if (field.kind === 'enum') {
    const current = field.values.includes(value) ? value : ''
    return (
      <Select.Root value={current} onValueChange={onChange}>
        <Select.Trigger className={(compact ? 'h-8 text-xs ' : '') + (field.widthClass ?? '')} aria-label={field.label ?? field.name}>
          <Select.Value placeholder="-" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">-</Select.Item>
          {field.values.map((v) => (
            <Select.Item key={v} value={v}>
              {showIds ? v : tl(field.labels?.[v] ?? v)}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    )
  }
  if (field.kind === 'multiline') {
    return <AutoTextarea value={value} onChange={onChange} rows={4} />
  }
  if (field.kind === 'text' && field.autocomplete) {
    return (
      <AutocompleteInput
        source={field.autocomplete}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        className={field.widthClass}
        compact={compact}
      />
    )
  }
  return (
    <Input
      type="text"
      inputMode={field.kind === 'int' ? 'numeric' : undefined}
      value={value}
      onChange={(e) => {
        const next = e.target.value
        onChange(field.kind === 'int' && field.digitsOnly ? next.replace(/\D/g, '') : next)
      }}
      className={(compact ? 'h-8 text-xs ' : '') + (field.widthClass ?? '')}
      placeholder={field.placeholder ?? (field.kind === 'int' ? '0' : undefined)}
    />
  )
}

export function FieldEditor({
  field,
  value,
  onChange,
  accentColor,
  showIds
}: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
  accentColor?: string
  showIds?: boolean
}): JSX.Element {
  const { t, tl } = useI18n()
  switch (field.kind) {
    case 'attrs': {
      const record = (value ?? {}) as Record<string, string>
      return (
        <div className="space-y-2 rounded-md border border-border/70 bg-secondary/20 p-3">
          <div className="text-xs font-medium text-muted-foreground">{showIds ? field.name : tl(field.label ?? field.name)}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {field.attrs.map((a) => (
              <div key={a.name} className="space-y-1">
                <FieldLabel label={tl(a.label ?? a.name)} required={(a as any).required} />
                <ScalarEditor
                  field={a}
                  value={record[a.name] ?? ''}
                  onChange={(v) => onChange({ ...record, [a.name]: v })}
                  accentColor={accentColor}
                  showIds={showIds}
                />
              </div>
            ))}
          </div>
        </div>
      )
    }

    case 'multi': {
      const values = (value ?? []) as string[]
      if (field.values) {
        const toggle = (v: string) => {
          const next = values.includes(v) ? values.filter((x) => x !== v) : [...values, v]
          onChange(next)
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {field.values.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => toggle(v)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  values.includes(v) ? 'bg-accent/60' : 'border-border bg-secondary/40 text-muted-foreground hover:bg-accent'
                }`}
                style={
                  values.includes(v) && accentColor
                    ? { borderColor: accentColor, color: accentColor, backgroundColor: accentColor + '26' }
                    : undefined
                }
              >
                {showIds ? v : tl(field.labels?.[v] ?? v)}
              </button>
            ))}
          </div>
        )
      }
      return <MultiTextInput values={values} onChange={onChange} placeholder={tl(field.label ?? field.name)} />
    }

    case 'bool':
      return (
        <button
          type="button"
          onClick={() => onChange(!Boolean(value))}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            value ? 'bg-accent/60 text-foreground' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-accent/40'
          }`}
          style={value && accentColor ? { borderColor: accentColor, color: accentColor, backgroundColor: accentColor + '26' } : undefined}
        >
          {showIds ? field.name : tl(field.label ?? field.name)}
        </button>
      )

        case 'marker':
      return (
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-secondary/20 px-3 py-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 accent-[hsl(var(--primary))]"
          />
          <span className="text-sm">{tl(field.label ?? field.name)}</span>
        </label>
      )

    case 'attr':
      return (
        <ScalarEditor
          field={field.field}
          value={(value ?? '') as string}
          onChange={onChange as (v: string) => void}
          accentColor={accentColor}
          showIds={showIds}
        />
      )

    case 'list': {
      const rows = (value ?? []) as any[]
      const update = (next: any[]) => onChange(next)
      const hatEnabled = useAppStore((s) => s.hatEnabled)
      const atLimit = Boolean(field.maxItems) && rows.length >= (field.maxItems as number) && !hatEnabled
      const unreasonable = rows.some((row: any) => {
        const type = row[':@']?.['@_Type'] ?? ''
        const detail = row[':@']?.['@_Detail'] ?? ''
        return (type === 'Def' && ['Hit', 'Penetrate', 'Slash'].includes(detail)) || (type === 'Atk' && ['Guard', 'Evasion'].includes(detail))
      })
      return (
        <div className="space-y-2 rounded-md border border-border/70 bg-secondary/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{tl(field.label ?? field.name)}</span>
            <div className="flex items-center gap-2">
              {unreasonable ? (
                <span className="text-[10px] text-amber-400/80">{t('diceUnreasonable')}</span>
              ) : null}
              {atLimit ? (
                <span className="text-[10px] text-amber-400/80">{t('maxHint', { n: field.maxItems ?? 0 })}</span>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                disabled={atLimit}
                onClick={() =>
                  update([...rows, makeElement(field.item, Object.fromEntries(field.attrs.map((a) => [a.name, ''])))])
                }
              >
                <Plus /> {field.addLabel ?? t('addRow')}
              </Button>
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground/70">{t('emptyRows')}</div>
          ) : (
            <div className="space-y-2">
              {rows.map((row, ri) => (
                <div key={ri} className="rounded-md border border-border bg-background/60 p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <Badge variant="outline">#{ri + 1}</Badge>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={ri === 0}
                        onClick={() => {
                          const next = [...rows]
                          ;[next[ri - 1], next[ri]] = [next[ri], next[ri - 1]]
                          update(next)
                        }}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={ri === rows.length - 1}
                        onClick={() => {
                          const next = [...rows]
                          ;[next[ri + 1], next[ri]] = [next[ri], next[ri + 1]]
                          update(next)
                        }}
                      >
                        <ChevronDown />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-red-400 hover:text-red-300"
                        onClick={() => update(rows.filter((_, i) => i !== ri))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3">
                    {field.attrs.map((a) => (
                      <div key={a.name} className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground/70">{tl(a.label ?? a.name)}</span>
                        <ScalarEditor
                          compact
                          field={a}
                          value={getAttr(row, a.name) ?? ''}
                          onChange={(v) => {
                            const next = structuredClone(rows)
                            setAttr(next[ri], a.name, v)
                            update(next)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    default: {
      const v = (value ?? '') as string
      return <ScalarEditor field={field} value={v} onChange={onChange} accentColor={accentColor} showIds={showIds} />
    }
  }
}

function MultiTextInput({
  values,
  onChange,
  placeholder
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}): JSX.Element {
  const { t } = useI18n()
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v) return
    onChange([...values, v])
    setDraft('')
  }
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
        />
        <Button size="sm" variant="secondary" onClick={add}>
          <Plus /> {t('addItem')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[11px]"
          >
            {v}
            <button type="button" className="opacity-60 hover:opacity-100" onClick={() => onChange(values.filter((_, x) => x !== i))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}