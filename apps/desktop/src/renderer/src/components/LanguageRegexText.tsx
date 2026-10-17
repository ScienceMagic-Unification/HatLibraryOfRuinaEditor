import { useRegexRules } from '../lib/useRegexRules'
import type { KeywordScope } from '../lib/keywordPreview'
import { RegexText } from './RegexText'

/** Each bilingual proofreading row resolves its own language, independently of the active editor. */
export function LanguageRegexText({ text, language, scope }: { text: string; language?: string; scope?: KeywordScope }): JSX.Element {
  const rules = useRegexRules(language)
  return <RegexText text={text} rules={rules} scope={scope} />
}
