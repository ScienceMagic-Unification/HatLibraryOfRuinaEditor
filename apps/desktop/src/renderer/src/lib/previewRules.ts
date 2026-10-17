import { getMulti, getTextField, getNodeText, nodeChildren, listEntities, parseXml, serializeNode, setAttr, setMulti, setTextField, type OrderedDoc, type OrderedNode } from '@ruina/editor-core'
import manifest from '../assets/plugins/manifest.json'

/** 内置正则 XML（原版/奇点）解析出的词典条目。 */
export interface BattleEffectTextEntry {
  id: string
  name: string
  recognizeName: string
  desc: string
  keywordIconId: string
  color: string
  hasBracket: boolean
  isUnderline: boolean
  isItalic: boolean
  isBold: boolean
  isChangeSelf: boolean
  isChangeAbility: boolean
  isChangePassive: boolean
  isAutoLink: boolean
  isCardPreview: boolean
  cardPreview: string[]
  recognizeNames?: string[]
  keepRecognizeName?: boolean
  iconName?: string
  iconSheetName?: string
  plugin?: string
  language?: string
  requestedLanguage?: string
  resourceName?: string
  legacy?: boolean
  rawSource?: string
}

const regexSchema = {
  root: 'BattleEffectTextRootExtra',
  entity: 'BattleEffectTextExtra',
  idAttr: 'ID',
  containerPath: ['extraTextList'],
  fields: []
}

function toBool(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true'
}

function fileNameFromPath(path: string): string {
  const last = path.split('/').pop() ?? path
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

function mapEntry(ref: { id: string; node: unknown }): BattleEffectTextEntry {
  const node = ref.node as any
  return {
    id: ref.id,
    rawSource: serializeNode(node),
    name: getTextField(node, 'Name') ?? '',
    recognizeName: getTextField(node, 'RecognizeName') ?? '',
    recognizeNames: nodeChildren(node).filter((n: any) => n && 'RecognizeName' in n).map((n) => getNodeText(n as OrderedNode)),
    keepRecognizeName: toBool(getTextField(node, 'KeepRecognizeName')),
    iconName: getTextField(node, 'IconName') ?? '',
    iconSheetName: getTextField(node, 'IconSheetName') ?? '',
    desc: getTextField(node, 'Desc') ?? '',
    keywordIconId: getTextField(node, 'KeywordIconId') ?? '',
    color: getTextField(node, 'Color') ?? '',
    hasBracket: toBool(getTextField(node, 'HasBracket')),
    isUnderline: toBool(getTextField(node, 'IsUnderline')),
    isItalic: toBool(getTextField(node, 'IsItalic')),
    isBold: toBool(getTextField(node, 'IsBold')),
    isChangeSelf: toBool(getTextField(node, 'IsChangeSelf')),
    isChangeAbility: toBool(getTextField(node, 'IsChangeAbility')),
    isChangePassive: toBool(getTextField(node, 'IsChangePassive')),
    isAutoLink: toBool(getTextField(node, 'IsAutoLink')),
    isCardPreview: toBool(getTextField(node, 'IsCardPreview')),
    cardPreview: getMulti(node, 'CardPreview')
  }
}

/** 读取打包镜像 assets/regex/*.xml，并解析成词典数组。 */
export function parseRegexXml(raw: string, includePlain = false): BattleEffectTextEntry[] {
  const doc = parseXml(raw)
  const legacy = raw.includes('<OriginKeywordTextRoot')
  const schema = legacy ? { ...regexSchema, root: 'OriginKeywordTextRoot', containerPath: ['TextList'], entity: 'OriginKeywordText' } : regexSchema
  const plain = listEntities(doc, { ...regexSchema, containerPath: ['effectTextList'], entity: 'BattleEffectText' }).map(mapEntry)
  const entries = listEntities(doc, schema).map((ref) => {
    const e = mapEntry(ref)
    const base = plain.find((p) => p.id === e.id)
    return { ...e, name: e.name || base?.name || '', desc: e.desc || base?.desc || '', legacy }
  })
  return includePlain ? [...entries, ...plain.filter((p) => !entries.some((e) => e.id === p.id))] : entries
}

/** 从已解析的 Mod EffectText 文档中提取 BattleEffectTextExtra 词条（extraTextList）。 */
export function extractEffectTextEntries(doc: OrderedDoc): BattleEffectTextEntry[] {
  return listEntities(doc, regexSchema).map(mapEntry)
}

/** Update only edited fields, retaining unknown nodes, repeated values and CardPreview attributes. */
export function writeKeywordEntry(node: OrderedNode, entry: BattleEffectTextEntry): void {
  const before = mapEntry({ id: entry.id, node })
  setAttr(node, 'ID', entry.id)
  const fields: [keyof BattleEffectTextEntry, string][] = [
    ['name', 'Name'], ['desc', 'Desc'], ['keywordIconId', 'KeywordIconId'], ['iconName', 'IconName'], ['iconSheetName', 'IconSheetName'], ['color', 'Color'],
    ['keepRecognizeName', 'KeepRecognizeName'], ['hasBracket', 'HasBracket'], ['isUnderline', 'IsUnderline'], ['isBold', 'IsBold'], ['isItalic', 'IsItalic'],
    ['isChangeSelf', 'IsChangeSelf'], ['isChangeAbility', 'IsChangeAbility'], ['isChangePassive', 'IsChangePassive'], ['isAutoLink', 'IsAutoLink'], ['isCardPreview', 'IsCardPreview']
  ]
  for (const [key, xml] of fields) if (entry[key] !== undefined && entry[key] !== before[key]) setTextField(node, xml, String(entry[key]))
  const names = entry.recognizeNames ?? [entry.recognizeName]
  if (JSON.stringify(names) !== JSON.stringify(before.recognizeNames)) setMulti(node, 'RecognizeName', names)
  if (JSON.stringify(entry.cardPreview) !== JSON.stringify(before.cardPreview)) setMulti(node, 'CardPreview', entry.cardPreview)
}

const regexModules = import.meta.glob('../assets/regex/*.xml', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const pluginXml = import.meta.glob('../assets/plugins/*.xml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const pluginEntries = manifest.resources.filter((r) => r.kind === 'xml').flatMap((r) => {
  const raw = pluginXml[`../assets/plugins/${r.path}`] ?? ''
  return parseRegexXml(raw, true).map((e) => ({ ...e, plugin: r.plugin, language: r.language, resourceName: r.name }))
})
export const normalizeKeywordLanguage = (s: string): string => ({ zh: 'cn', ja: 'jp', ko: 'kr' }[s] ?? s)

function baseName(setId: 'vanilla' | 'singularity'): string {
  return setId === 'vanilla' ? '原版正则' : '奇点正则'
}

/** Current document language; unavailable translations fall back to English. */
export function getBuiltinRegexEntries(setId: 'vanilla' | 'singularity', suffix: string): BattleEffectTextEntry[] {
  const s = normalizeKeywordLanguage(suffix || 'cn')
  const candidates = pluginEntries.filter((e) => (e.plugin === 'HatSingularity.KeywordView') === (setId === 'vanilla'))
  if (candidates.length) {
    const groups = new Map<string, BattleEffectTextEntry[]>()
    for (const e of candidates) groups.set(e.id, [...(groups.get(e.id) ?? []), e])
    return [...groups.values()].map((variants) => {
      const e = variants.find((v) => v.language === s) ?? variants.find((v) => v.language === 'en') ?? variants.find((v) => v.language === 'cn') ?? variants[0]
      return { ...e, requestedLanguage: s }
    })
  }
  const preferred = `${baseName(setId)}_${s}.xml`
  const fallback = `${baseName(setId)}_en.xml`
  const keys = Object.keys(regexModules)
  const key = keys.find((p) => fileNameFromPath(p) === preferred) ?? keys.find((p) => fileNameFromPath(p) === fallback)
  if (!key) return []
  return parseRegexXml(regexModules[key])
}

/** 当前正则集合实际存在哪些本地化（例如目前只有 cn）。 */
export function getBuiltinRegexLanguages(setId: 'vanilla' | 'singularity'): string[] {
  const base = baseName(setId)
  return [...new Set([...pluginEntries.filter((e) => (e.plugin === 'HatSingularity.KeywordView') === (setId === 'vanilla')).map((e) => e.language), ...Object.keys(regexModules).filter((p) => fileNameFromPath(p).startsWith(base + '_')).map((p) => fileNameFromPath(p).slice(base.length + 1, -4))])].filter(Boolean)
}

/** 当前打包镜像中的内置正则文件名。 */
export const builtinRegexFileNames = Object.keys(regexModules).map(fileNameFromPath)
