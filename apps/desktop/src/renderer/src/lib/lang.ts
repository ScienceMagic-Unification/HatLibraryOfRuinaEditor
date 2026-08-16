export function editorLangToDocLang(editorLang: string): string {
  if (editorLang === 'en') return 'en'
  if (editorLang === 'jp') return 'jp'
  return 'cn'
}

export interface LangInfo {
  lang: string
  label: string
}

/**
 * 语言判别：优先用文件/目录名中的语言标记（cn、zh、en…），
 * 判别不到时统计文本中的中文/拉丁字符比例来推断。
 */
export function detectLang(path: string, text: string): LangInfo {
  const p = path.toLowerCase()
  const named: Array<[RegExp, string, string]> = [
    [/(?:\\|\/)cn(?:\\|\/|_|-|\.)/, 'cn', '简体中文'],
    [/(?:[._-])(cn|zh|chs)(?:\.[^\\/]*$|$)/i, 'cn', '简体中文'],
    [/(?:\\|\/)zh(?:\\|\/|_|-|\.)/, 'cn', '简体中文'],
    [/\.(cn|zh|chs)\./, 'cn', '简体中文'],
    [/(?:\\|\/)en(?:\\|\/|_|-|\.)/, 'en', 'English'],
    [/(?:[._-])(en)(?:\.[^\\/]*$|$)/i, 'en', 'English'],
    [/\.en\./, 'en', 'English'],
    [/(?:\\|\/)jp(?:\\|\/|_|-|\.)/, 'jp', '日本語'],
    [/(?:\\|\/)ja(?:\\|\/|_|-|\.)/, 'jp', '日本語'],
    [/(?:[._-])(jp|ja)(?:\.[^\\/]*$|$)/i, 'ja', '日本語'],
    [/(?:\\|\/)ko(?:\\|\/|_|-|\.)/, 'ko', '한국어'],
    [/(?:\\|\/)kr(?:\\|\/|_|-|\.)/, 'ko', '한국어'],
    [/(?:\\|\/)ru(?:\\|\/|_|-|\.)/, 'ru', 'Русский'],
    [/(?:\\|\/)de(?:\\|\/|_|-|\.)/, 'de', 'Deutsch'],
    [/(?:\\|\/)fr(?:\\|\/|_|-|\.)/, 'fr', 'Français']
  ]
  for (const [re, lang, label] of named) {
    if (re.test(p)) return { lang, label }
  }

  const stripped = text.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ')
  let cjk = 0
  let latin = 0
  for (const ch of stripped) {
    if (/[\u4e00-\u9fff]/.test(ch)) cjk++
    else if (/[A-Za-z]/.test(ch)) latin++
  }
  if (cjk > 0 && cjk >= latin * 0.5) return { lang: 'cn', label: '简体中文' }
  if (latin > 0) return { lang: 'en', label: 'English' }
  return { lang: 'unknown', label: '未知语言' }
}