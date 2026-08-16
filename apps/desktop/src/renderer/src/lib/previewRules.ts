import { getMulti, getTextField, listEntities, parseXml, type OrderedDoc } from '@ruina/editor-core'

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
    name: getTextField(node, 'Name') ?? '',
    recognizeName: getTextField(node, 'RecognizeName') ?? '',
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
export function parseRegexXml(raw: string): BattleEffectTextEntry[] {
  const doc = parseXml(raw)
  return listEntities(doc, regexSchema).map(mapEntry)
}

/** 从已解析的 Mod EffectText 文档中提取 BattleEffectTextExtra 词条（extraTextList）。 */
export function extractEffectTextEntries(doc: OrderedDoc): BattleEffectTextEntry[] {
  return listEntities(doc, regexSchema).map(mapEntry)
}

const regexModules = import.meta.glob('../assets/regex/*.xml', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const ALL_SUFFIXES = ['cn', 'en', 'jp'] as const

function baseName(setId: 'vanilla' | 'singularity'): string {
  return setId === 'vanilla' ? '原版正则' : '奇点正则'
}

/** 按正则集合（原版/奇点）+ 本地化后缀（cn/en/jp）获取解析后的词典；找不到当前语言时回退 cn。 */
export function getBuiltinRegexEntries(setId: 'vanilla' | 'singularity', suffix: string): BattleEffectTextEntry[] {
  const s = suffix || 'cn'
  const preferred = `${baseName(setId)}_${s}.xml`
  const fallback = `${baseName(setId)}_cn.xml`
  const keys = Object.keys(regexModules)
  const key = keys.find((p) => fileNameFromPath(p) === preferred) ?? keys.find((p) => fileNameFromPath(p) === fallback)
  if (!key) return []
  return parseRegexXml(regexModules[key])
}

/** 当前正则集合实际存在哪些本地化（例如目前只有 cn）。 */
export function getBuiltinRegexLanguages(setId: 'vanilla' | 'singularity'): string[] {
  const base = baseName(setId)
  return ALL_SUFFIXES.filter((s) => Object.keys(regexModules).some((p) => fileNameFromPath(p) === `${base}_${s}.xml`))
}

/** 当前打包镜像中的内置正则文件名。 */
export const builtinRegexFileNames = Object.keys(regexModules).map(fileNameFromPath)
