import { getBuiltinRegexEntries, normalizeKeywordLanguage, type BattleEffectTextEntry } from './previewRules'
import { vanillaAbilityDescription } from './vanillaAbilities'

const rangeNames = new Map<string, Map<string, string>>()
function rangeName(range: string, language: string): string {
  let names = rangeNames.get(language)
  if (!names) {
    names = new Map(getBuiltinRegexEntries('vanilla', language)
      .filter((entry) => entry.id.startsWith('Origin_Range_'))
      .map((entry) => [entry.id, entry.name]))
    rangeNames.set(language, names)
  }
  return names.get('Origin_Range_' + range) || range || '—'
}

export function cardPreviewLabels(range: string, options: string[], language: string, rules: Map<string, BattleEffectTextEntry>, documentText?: (id: string) => string | undefined) {
  const locale = normalizeKeywordLanguage(language)
  const nativeText = (id: string) => vanillaAbilityDescription(id, locale) || ''
  const prefixes: string[] = []
  if (options.includes('ExhaustOnUse')) {
    const native = nativeText('exhaustOnUseText')
    const text = documentText?.('exhaustOnUseText') || native
    const rule = rules.get('ExhaustOnUse_Keyword')
    if (text === native && rule) {
      const label = native.replace(/^\[|\]$/g, '')
      prefixes.push(rule.language && rule.language !== locale
        ? `<HatKeyword id="ExhaustOnUse_Keyword">${label}</HatKeyword>`
        : '<HatKeyword id="ExhaustOnUse_Keyword"/>')
    } else prefixes.push(text)
  }
  const area = range === 'FarArea' ? 'areaText_summation' : range === 'FarAreaEach' ? 'areaText_single' : undefined
  if (!area) return { rangeLabel: rangeName(range, locale), prefixes }

  const native = nativeText(area)
  const rangeLabel = native.replace(/^\[|\]$/g, '')
  const text = documentText?.(area) || native
  prefixes.push(text === native && rules.has('Origin_Range_FarArea')
    ? '<HatKeyword id="Origin_Range_FarArea">' + rangeLabel + '</HatKeyword>'
    : text)
  return { rangeLabel, prefixes }
}
