import { useEffect, useState } from 'react'
import type { EntityRef, ModuleDefinition } from '@ruina/editor-core'
import { getAttr, listEntities, parseSingleNode, replaceEntityNode, serializeNode } from '@ruina/editor-core'
import { Button } from '@ruina/ui'
import { Check, Copy, Save } from 'lucide-react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'

/**
 * 源码模式：当前实体的原始 XML 可直接编辑，点击“应用”后解析回写（失败不落盘并提示）
 */
export function SourcePanel({ module, entity }: { module: ModuleDefinition; entity: EntityRef | null }): JSX.Element {
  const { t } = useI18n()
  const editData = useAppStore((s) => s.editData)
  const select = useAppStore((s) => s.select)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setDraft(entity ? serializeNode(entity.node) : '')
    setError('')
  }, [entity])

  if (!entity) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('preview.empty')}</div>
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // file:// 下剪贴板可能不可用
    }
  }

  const apply = () => {
    try {
      const parsed = parseSingleNode(draft, module.entity.entity)
      if (!parsed) {
        setError('解析失败：找不到有效的实体节点，请检查 XML 结构')
        return
      }
      const newId = getAttr(parsed, module.entity.idAttr) ?? ''
      editData(module.id, (doc) => {
        const refs = listEntities(doc, module.entity)
        const cur = refs.find((r) => r.id === entity.id)
        if (cur) replaceEntityNode(doc, module.entity, cur.index, parsed)
      })
      if (newId && newId !== entity.id) select(module.id, newId)
      setError('')
    } catch (e) {
      setError(`解析失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {t('source.label')} · <span className="font-mono">#{entity.id}</span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? t('copied') : t('copy')}
          </Button>
          <Button size="sm" onClick={apply}>
            <Save /> {t('apply')}
          </Button>
        </div>
      </div>
      {error ? (
        <div className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
      ) : null}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none overflow-auto rounded-lg border border-input bg-background/70 p-4 font-mono text-xs leading-relaxed text-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}