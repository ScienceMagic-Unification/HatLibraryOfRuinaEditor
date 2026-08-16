import { useMemo } from 'react'
import type { EntityRef, FieldDef, ModuleDefinition } from '@ruina/editor-core'
import { getFieldValue, getListRows, makeElement, setAttr } from '@ruina/editor-core'
import { Label } from '@ruina/ui'
import { Plus, Trash2 } from 'lucide-react'
import { FieldEditor } from './FieldEditor'
import { LinkedNameField } from './LinkedNameField'
import { diceIconUrl } from '../lib/diceIcons'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'

const DICE_ICONS = [
  { key: 'GuardDef', type: 'Def', detail: 'Guard', label: '招架' },
  { key: 'GuardStandby', type: 'Standby', detail: 'Guard', label: '反击招架' },
  { key: 'EvasionDef', type: 'Def', detail: 'Evasion', label: '闪避' },
  { key: 'EvasionStandby', type: 'Standby', detail: 'Evasion', label: '反击闪避' },
  { key: 'HitAtk', type: 'Atk', detail: 'Hit', label: '打击' },
  { key: 'HitStandby', type: 'Standby', detail: 'Hit', label: '反击打击' },
  { key: 'PenetrateAtk', type: 'Atk', detail: 'Penetrate', label: '突刺' },
  { key: 'PenetrateStandby', type: 'Standby', detail: 'Penetrate', label: '反击突刺' },
  { key: 'SlashAtk', type: 'Atk', detail: 'Slash', label: '斩击' },
  { key: 'SlashStandby', type: 'Standby', detail: 'Slash', label: '反击斩击' }
]

function motionFor(detail: string, range: string): string {
  if (detail === 'Guard') return 'G'
  if (detail === 'Evasion') return 'E'
  const remote = ['Far', 'FarArea', 'FarAreaEach'].includes(range)
  if (detail === 'Slash') return remote ? 'F' : 'J'
  if (detail === 'Hit') return remote ? 'F' : 'H'
  if (detail === 'Penetrate') return remote ? 'F' : 'Z'
  return 'F'
}

export function CardBriefPanel({
  module,
  entity,
  onFieldChange,
  onIdChange
}: {
  module: ModuleDefinition
  entity: EntityRef
  onFieldChange: (field: FieldDef, value: unknown) => void
  onIdChange: (id: string) => void
}): JSX.Element {
  const { t, tl } = useI18n()
  const hatEnabled = useAppStore((s) => s.hatEnabled)
  const fields = (name: string) => module.entity.fields.find((f) => f.name === name)
  const listField = fields('BehaviourList')
  const rows = listField ? getListRows(entity.node, listField as any) : []
  const rangeField = fields('Range')
  const range = rangeField ? ((getFieldValue(entity.node, rangeField) as string) ?? '') : ''
  const idOnly = module.entity.idOnlyList

  const updateRow = (ri: number, patch: (row: any) => void) => {
    if (!listField) return
    const next = structuredClone(rows)
    patch(next[ri])
    onFieldChange(listField, next)
  }

  const setDiceIcon = (ri: number, key: string) => {
    const icon = DICE_ICONS.find((i) => i.key === key)
    if (!icon) return
    updateRow(ri, (row) => {
      setAttr(row, 'Type', icon.type)
      setAttr(row, 'Detail', icon.detail)
      setAttr(row, 'Motion', motionFor(icon.detail, range))
    })
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-4">
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-md border border-border/60 bg-secondary/20 p-3">
        <div className={idOnly ? 'min-w-0 flex-1 space-y-1' : 'w-40 shrink-0 space-y-1'}>
          <Label>{t('id.label')}<span className="ml-0.5 text-red-400">*</span></Label>
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={entity.id}
            onChange={(e) => onIdChange(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        {(() => {
          const cost = fields('Cost')
          return cost ? (
            <div className="w-32 shrink-0 space-y-1">
              <Label>{tl('费用')}</Label>
              <FieldEditor field={cost} value={getFieldValue(entity.node, cost)} onChange={(v) => onFieldChange(cost, v)} />
            </div>
          ) : null
        })()}
      </div>

      <div className="space-y-3">
        <LinkedNameField
          module={module}
          entity={entity}
          value={(getFieldValue(entity.node, fields('Name')!) as string) ?? ''}
          onValueChange={(v) => onFieldChange(fields('Name')!, v)}
        />
        {(() => {
          const f = fields('Script')
          return f ? (
            <div className="space-y-1">
              <Label>{tl('卡牌能力')}</Label>
              <FieldEditor field={f} value={getFieldValue(entity.node, f)} onChange={(v) => onFieldChange(f, v)} />
            </div>
          ) : null
        })()}
        {['Rarity', 'Range', 'Chapter'].map((name) => {
          const f = fields(name)
          if (!f) return null
          return (
            <div key={name} className="space-y-1">
              <Label>{tl(name === 'Rarity' ? '稀有度' : name === 'Range' ? '射程' : '章节')}</Label>
              <FieldEditor field={f} value={getFieldValue(entity.node, f)} onChange={(v) => onFieldChange(f, v)} />
            </div>
          )
        })}
        <div className="space-y-2 rounded-md border border-border/70 bg-secondary/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{tl('骰子列表')}</span>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
              disabled={!listField || (!hatEnabled && rows.length >= 5)}
              onClick={() => onFieldChange(listField!, [...rows, makeElement('Behaviour', { Min: '1', Dice: '1', Type: 'Atk', Detail: 'Hit', Motion: motionFor('Hit', range) })])}
            >
              <Plus className="size-3.5" /> {t('addDice')}
            </button>
          </div>
          {rows.length === 0 ? (
            <div className="py-2 text-center text-xs text-muted-foreground/70">{t('emptyRows')}</div>
          ) : (
            <div className="space-y-2">
              {rows.map((row: any, ri: number) => {
                const type = row[':@']?.['@_Type'] ?? ''
                const detail = row[':@']?.['@_Detail'] ?? ''
                const motion = row[':@']?.['@_Motion'] ?? ''
                const min = row[':@']?.['@_Min'] ?? ''
                const dice = row[':@']?.['@_Dice'] ?? ''
                const selectedKey = DICE_ICONS.find((i) => i.type === type && i.detail === detail)?.key
                return (
                  <div key={ri} className="rounded-md border border-border bg-background/60 p-2">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-muted-foreground">{tl('最小值')}</span>
                        <input
                          className="h-7 w-14 rounded border border-input bg-background px-2 text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          value={min}
                          onChange={(e) => updateRow(ri, (r) => setAttr(r, 'Min', e.target.value.replace(/\D/g, '')))}
                        />
                        <span className="text-muted-foreground">~</span>
                        <span className="text-muted-foreground">{tl('最大值')}</span>
                        <input
                          className="h-7 w-14 rounded border border-input bg-background px-2 text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          value={dice}
                          onChange={(e) => updateRow(ri, (r) => setAttr(r, 'Dice', e.target.value.replace(/\D/g, '')))}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-muted-foreground">{tl('动作')}</span>
                        <input className="h-7 w-12 rounded border border-input bg-background px-2 text-center font-mono text-xs text-muted-foreground" value={motion} disabled />
                      </div>
                      <button className="ml-auto text-red-400 hover:text-red-300" onClick={() => onFieldChange(listField!, rows.filter((_, i) => i !== ri))}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DICE_ICONS.map((icon) => {
                        const url = diceIconUrl(icon.detail, icon.type)
                        const selected = selectedKey === icon.key
                        return (
                          <button
                            key={icon.key}
                            title={icon.label}
                            onClick={() => setDiceIcon(ri, icon.key)}
                            className={`flex size-9 items-center justify-center rounded-md border transition-colors ${selected ? 'border-primary bg-primary/15' : 'border-border bg-secondary/30 hover:bg-accent/40'}`}
                          >
                            {url ? <img src={url} alt={icon.label} className="size-7 object-contain" draggable={false} /> : icon.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}