(async () => {
  const root = window.__keywordTestRoot, store = window.__store
  const saved = { ...localStorage }
  const wait = () => new Promise((r) => setTimeout(r, 180))
  const check = (v, message) => { if (!v) throw new Error(message) }
  const input = (el, value) => { Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })) }
  const id = 'Hat_Enchantments_Throughout_Dice_Keyword'
  const names = { cn: '贯通', en: 'Piercing', jp: '突破', kr: '돌파' }
  try {
    await store.getState().openMod(root + '/docs/verification/localization-mod')
    store.getState().setHatEnabled(true); store.getState().setRegexAutocomplete(true)
    await store.getState().setActiveModule('singularity-abilities'); await wait()
    let page = document.querySelector('[data-testid="singularity-abilities"]')
    input([...page.querySelectorAll('input')].find((e) => !e.readOnly), 'Throughout'); await wait()
    page.querySelector('[data-scrollkey="singularity-abilities"] .cursor-pointer').click(); await wait()
    for (const [language, name] of Object.entries(names)) {
      const select = page.querySelectorAll('select')[1]
      select.value = language; select.dispatchEvent(new Event('change', { bubbles: true })); await wait()
      check(store.getState().primaryLang['singularity-abilities'] === language, 'Persist ability language ' + language)
      check(page.querySelector(`[data-keyword-id="${id}"]`)?.textContent === name, 'Ability language ' + language)
      check(page.querySelector(`[data-keyword-id="${id}"] img`)?.naturalWidth > 0, 'Icon ' + language)
    }
    await store.getState().setActiveModule('singularity-regex'); await wait()
    for (const [language, name] of Object.entries(names)) {
      store.getState().setPrimaryLang('singularity-regex', language); await wait()
      check([...document.querySelectorAll('button')].some((b) => b.textContent.includes(id) && b.querySelector('.font-medium')?.textContent === name), 'Regex list language ' + language)
    }
    await store.getState().setActiveModule('singularity-abilities'); await wait()
    page = document.querySelector('[data-testid="singularity-abilities"]')
    check(page.querySelectorAll('select')[1].value === 'kr', 'Language survives remount')
    await store.getState().setActiveModule('cardability'); store.getState().select('cardability', 'LocalizationDemo'); await wait()
    const documents = Object.values(store.getState().docs).filter((d) => d.root === 'BattleCardAbilityDescRoot')
    for (const [language, name] of Object.entries(names)) {
      const doc = documents.find((d) => d.path.replaceAll('\\', '/').includes('/' + language + '/'))
      check(doc, 'Document ' + language)
      store.getState().setPrimaryDoc('cardability', doc.path); store.getState().setPrimaryLang('cardability', doc.lang); await wait()
      check([...document.querySelectorAll(`[data-keyword-id="${id}"]`)].some((e) => e.textContent === name), 'Document preview ' + language)
      const area = [...document.querySelectorAll('textarea')].find((a) => !a.readOnly && a.value.includes(id))
      check(area, 'Editable document ' + language)
      const original = area.value
      area.focus(); input(area, name); area.setSelectionRange(name.length, name.length); await wait()
      const suggestion = [...document.querySelectorAll('.absolute.inset-x-0')].find((e) => e.textContent.includes(id))
      check(suggestion?.textContent.includes(name), 'Live completion ' + language)
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); input(area, original); await wait()
      area.setSelectionRange(0, 0)
      ;[...document.querySelectorAll('button')].find((b) => b.textContent === '关键词库 / 插入').click(); await wait()
      input(document.querySelector('[role="dialog"] input'), id); await wait()
      const preview = document.querySelector(`[role="dialog"] [data-keyword-id="${id}"]`)
      check(preview?.textContent === name, 'Keyword picker language ' + language)
      if (language === 'cn' || language === 'kr') {
        const aliases = { DreamUniverse_Insight_Keyword: 'Hat_Enchantments_Precision_Keyword', DreamUniverse_MultipleHit_Keyword: 'Hat_Enchantments_MultipleHit_Keyword', DreamUniverse_Harmonious_Keyword: 'Hat_Enchantments_Harmonious_Keyword', Hat_Enchantments_DiscoverCard_Keyword: 'Hat_Enchantments_BrowseCard_Keyword' }
        for (const [oldId, newId] of Object.entries(aliases)) {
          input(document.querySelector('[role="dialog"] input'), oldId); await wait()
          const entry = document.querySelector(`[role="dialog"] [data-keyword-id="${newId}"]`)
          check(entry && entry.querySelector('img')?.naturalWidth > 0, 'Migration search and icon ' + language + ': ' + newId)
          check(!document.querySelector(`[role="dialog"] [data-keyword-id="${oldId}"]`), 'No duplicate old identity')
        }
        input(document.querySelector('[role="dialog"] input'), 'Hat_Enchantments_ExhaustDice_Description_Keyword'); await wait()
        check(document.querySelector('[role="dialog"] [data-keyword-id="Hat_Enchantments_ExhaustDice_Description_Keyword"]')?.textContent === (language === 'cn' ? '佚亡' : '소멸'), 'Dedicated exhaustion identity ' + language)
      }
      document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait()
    }
    await store.getState().setActiveModule('singularity-abilities'); await wait()
    await window.api.saveFile(root + '/docs/verification/localization-ui-result.txt', 'PASS: cn/en/jp/kr ability catalog, icons, regex lists, document previews, live completion and keyword picker; 3.9 migration aliases and new icons, dedicated exhaustion; stored language survives remount; UI remains Chinese.')
  } finally {
    for (const key of Object.keys(localStorage)) if (!(key in saved)) localStorage.removeItem(key)
    for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value)
  }
})()
