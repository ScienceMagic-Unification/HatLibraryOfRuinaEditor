import { useMemo, useState } from 'react'
import type { ModuleDefinition, RegexRule } from '@ruina/editor-core'
import {
  applyRegex,
  getTextField,
  listEntities,
  parseSingleNode,
  parseXml,
  previewRegex,
  replaceEntityNode,
  serializeNode,
  serializeXml,
  setTextField
} from '@ruina/editor-core'
import { Badge, Button, Input, Label, Select } from '@ruina/ui'
import { Play, Replace } from 'lucide-react'
import { useAppStore } from '../store'

export function RegexPanel({ module }: { module: ModuleDefinition }): JSX.Element {
  const docs = useAppStore((s) => s.docs)
  const selectedId = useAppStore((s) => s.selectedId[module.id] ?? null)
  const editDoc = useAppStore((s) => s.editDoc)

  const primaryLang = useAppStore((s) => s.primaryLang[module.id])
  const primaryDocs = useMemo(
    () => Object.values(docs).filter((d) => d.bindings[module.id]?.kind === 'primary'),
    [docs, module.id]
  )
  const dataDoc = primaryDocs.find((d) => d.lang === primaryLang) ?? primaryDocs[0]
  const dataPath = dataDoc?.path

  const rules = module.regexRules ?? []
  const [ruleId, setRuleId] = useState(rules[0]?.id ?? '')
  const rule = rules.find((r) => r.id === ruleId)
  const [pattern, setPattern] = useState(rules[0]?.pattern ?? '')
  const [replacement, setReplacement] = useState(rules[0]?.replacement ?? '')
  const [flags, setFlags] = useState(rules[0]?.flags ?? 'g')
  const [scope, setScope] = useState<RegexRule['scope']>(rules[0]?.scope ?? 'file')
  const [field, setField] = useState(rules[0]?.field ?? '')
  const [matches, setMatches] = useState<{ line: number; preview: string }[]>([])
  const [message, setMessage] = useState('')
  const [applied, setApplied] = useState(0)

  const pickRule = (id: string) => {
    setRuleId(id)
    const r = rules.find((x) => x.id === id)
    if (!r) return
    setPattern(r.pattern)
    setReplacement(r.replacement)
    setFlags(r.flags ?? 'g')
    setScope(r.scope)
    setField(r.field ?? '')
    setMatches([])
    setMessage('')
    setApplied(0)
  }

  const entity = useMemo(() => {
    if (!dataDoc || !selectedId) return null
    const refs = listEntities(dataDoc.doc, module.entity)
    return refs.find((r) => r.id === selectedId) ?? null
  }, [dataDoc, selectedId, module.entity])

  const scopeText = (): string | null => {
    if (!dataDoc) return null
    if (scope === 'file') return serializeXml(dataDoc.doc)
    if (!entity) return null
    if (scope === 'field') return getTextField(entity.node, field) ?? ''
    return serializeNode(entity.node)
  }

  const doPreview = () => {
    const text = scopeText()
    if (text === null) {
      setMessage('当前没有可应用的目标（请先选择记录）')
      setMatches([])
      return
    }
    const r = previewRegex(text, pattern, flags)
    if (r.error) {
      setMessage(`正则错误：${r.error}`)
      setMatches([])
      return
    }
    setMatches(r.matches.map((m) => ({ line: m.line, preview: m.preview })))
    setMessage(`命中 ${r.count} 处`)
    setApplied(0)
  }

  const doApply = () => {
    if (!dataPath || !dataDoc) return
    editDoc(dataPath, (doc) => {
      const refs = listEntities(doc, module.entity)
      const target = refs.find((r) => r.id === selectedId) ?? null
      if (scope === 'file') {
        const r = applyRegex(serializeXml(doc), pattern, replacement, flags)
        if (r.error) {
          setMessage(`正则错误：${r.error}`)
          return
        }
        const parsed = parseXml(r.text)
        doc.length = 0
        for (const n of parsed) doc.push(n)
        setApplied(r.count)
        setMessage(`已替换 ${r.count} 处（可撤销）`)
        return
      }
      if (!target) {
        setMessage('请先选择一条记录')
        return
      }
      if (scope === 'field') {
        const cur = getTextField(target.node, field) ?? ''
        const r = applyRegex(cur, pattern, replacement, flags)
        if (r.error) {
          setMessage(`正则错误：${r.error}`)
          return
        }
        setTextField(target.node, field, r.text)
        setApplied(r.count)
        setMessage(`已替换 ${r.count} 处（可撤销）`)
        return
      }
      const chunk = serializeNode(target.node)
      const r = applyRegex(chunk, pattern, replacement, flags)
      if (r.error) {
        setMessage(`正则错误：${r.error}`)
        return
      }
      const parsedNode = parseSingleNode(r.text, module.entity.entity)
      if (parsedNode) replaceEntityNode(doc, module.entity, target.index, parsedNode)
      setApplied(r.count)
      setMessage(`已替换 ${r.count} 处（可撤销）`)
    })
  }

  if (rules.length === 0) {
    return <div className="p-6 text-center text-xs text-muted-foreground">此模块未配置专属正则规则</div>
  }

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-1.5">
        <Label>规则库（仅对本 XML 生效）</Label>
        <Select.Root value={ruleId} onValueChange={pickRule}>
          <Select.Trigger>
            <Select.Value placeholder="选择预设规则" />
          </Select.Trigger>
          <Select.Content>
            {rules.map((r) => (
              <Select.Item key={r.id} value={r.id}>
                {r.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        {rule?.description ? <p className="text-[11px] text-muted-foreground">{rule.description}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>作用范围</Label>
          <Select.Root value={scope} onValueChange={(v) => setScope(v as RegexRule['scope'])}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="file">整个文件</Select.Item>
              <Select.Item value="selected">选中记录</Select.Item>
              <Select.Item value="field">指定字段</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
        <div className="space-y-1">
          <Label>正则标志</Label>
          <Input value={flags} onChange={(e) => setFlags(e.target.value)} className="font-mono" />
        </div>
      </div>
      {scope === 'field' ? (
        <div className="space-y-1">
          <Label>字段名</Label>
          <Input value={field} onChange={(e) => setField(e.target.value)} className="font-mono" />
        </div>
      ) : null}
      <div className="space-y-1">
        <Label>查找（正则）</Label>
        <Input value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-1">
        <Label>替换为</Label>
        <Input value={replacement} onChange={(e) => setReplacement(e.target.value)} className="font-mono" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={doPreview} className="flex-1">
          <Play /> 预览命中
        </Button>
        <Button size="sm" variant="destructive" onClick={doApply} className="flex-1">
          <Replace /> 执行替换
        </Button>
      </div>
      {message ? (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={applied > 0 || matches.length > 0 ? 'success' : 'warning'}>{message}</Badge>
          {applied > 0 ? <span className="text-muted-foreground">修改已进入撤销栈</span> : null}
        </div>
      ) : null}
      {matches.length > 0 ? (
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border bg-background/60 p-2">
          {matches.slice(0, 200).map((m, i) => (
            <div key={i} className="font-mono text-[11px] leading-snug">
              <span className="mr-1 text-muted-foreground">{m.line}:</span>
              <span>{m.preview}</span>
            </div>
          ))}
          {matches.length > 200 ? <div className="text-xs text-muted-foreground">…共 {matches.length} 处，仅显示前 200 处</div> : null}
        </div>
      ) : null}
    </div>
  )
}

