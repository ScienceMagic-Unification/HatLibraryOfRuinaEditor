(async () => {
  const root = window.__keywordTestRoot, store = window.__store
  const saved = { ...localStorage }, originals = new Map()
  const wait = () => new Promise((r) => setTimeout(r, 180))
  const check = (value, message) => { if (!value) throw new Error(message) }
  const input = (el, value) => { Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })) }
  const click = (label) => { const button = [...document.querySelectorAll('button')].find((b) => b.textContent === label); check(button, label); button.click() }
  const key = 'Hat_Enchantments_MultipleHit_Keyword'
  try {
    await store.getState().openMod(root + '/docs/verification/localization-mod')
    store.getState().setHatEnabled(true); store.getState().setRegexAutocomplete(true)
    await store.getState().setActiveModule('cardability'); store.getState().select('cardability', 'LocalizationDemo'); await wait()
    const docs = Object.values(store.getState().docs).filter((d) => d.root === 'BattleCardAbilityDescRoot')
    const manifest = JSON.parse(await window.api.readTextFile(root + '/apps/desktop/src/renderer/src/assets/plugins/manifest.json'))
    for (const language of ['en', 'jp', 'kr', 'cn']) {
      const doc = docs.find((d) => d.path.replaceAll('\\', '/').includes('/' + language + '/'))
      check(doc, language + ' document')
      originals.set(doc.path, await window.api.readTextFile(doc.path))
      store.getState().setPrimaryDoc('cardability', doc.path); store.getState().setPrimaryLang('cardability', doc.lang); await wait()
      const resource = manifest.resources.find((r) => r.plugin === 'HatSingularity.Enchantments' && r.language === language && r.name.endsWith('.DiceEffects.xml'))
      const xml = new DOMParser().parseFromString(await window.api.readTextFile(root + '/apps/desktop/src/renderer/src/assets/plugins/' + resource.path), 'text/xml')
      const name = xml.querySelector(`[ID="${key}"] Name`).textContent
      let area = [...document.querySelectorAll('textarea')].find((a) => !a.readOnly && a.value.includes('HatKeyword'))
      check(area, 'Text editor ' + language)
      area.focus(); input(area, key); area.setSelectionRange(key.length, key.length); await wait()
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait()
      check(area.value === `(~HatKeyword id="${key}" value=""/~)`, 'Parameter autocomplete ' + language)
      check(area.selectionStart === area.value.indexOf('value="') + 7, 'Cursor inside parameter')

      const tag = `<HatKeyword value='2' id='${key}'/>`, prefix = '次元裂隙 的骰子具有 ', suffix = '\n后文保留'
      input(area, prefix + tag + suffix); await wait()
      let preview = [...document.querySelectorAll(`[data-keyword-id="${key}"]`)].find((e) => e.textContent === name + ':2')
      check(preview?.querySelector('img')?.naturalWidth > 0, 'Reported value and icon ' + language)
      check(!document.querySelector('[role="note"]'), 'No parser warning ' + language)
      check(preview.title.includes(key), 'Keyword tooltip')
      area.focus(); area.setSelectionRange(prefix.length, prefix.length + tag.length)
      click('关键词库 / 插入'); await wait()
      const parameter = document.querySelector('[role="dialog"] input[aria-label="参数"]')
      check(parameter?.type === 'text' && parameter.value === '2', 'Selected parameter edit ' + language)
      const value = ' X+1 & "quoted" <b>tag</b> a~)b '
      input(parameter, value); await wait()
      preview = document.querySelector(`[role="dialog"] [data-keyword-id="${key}"]`)
      check(preview.textContent === name + ':' + value, 'Literal parameter preview ' + language)
      check(preview.querySelectorAll('span').length === 0, 'No injected rich text')
      check(getComputedStyle(preview).whiteSpace === 'pre-wrap', 'Literal spaces')
      click('插入原始引用'); await wait()
      area = [...document.querySelectorAll('textarea')].find((a) => !a.readOnly && a.value.includes(key))
      check(area.value.startsWith(prefix + '(~HatKeyword') && area.value.endsWith(suffix), 'Replace selection only')
      check(area.value.includes('value=" X+1 &amp; &quot;quoted&quot; &lt;b&gt;tag&lt;/b&gt; a~)b "'), 'Encode inner attributes')
      const expected = area.value
      await store.getState().saveModule('cardability')
      const exported = await window.api.readTextFile(doc.path)
      const content = new DOMParser().parseFromString(exported, 'text/xml').querySelector('Desc').textContent
      check(content === expected, 'XML round-trip ' + language)
      check(exported.includes('&amp;quot;'), 'Outer XML entity layer')
      // Leave the screenshot on the reported case after verifying literal editing and serialization.
      input(area, prefix + tag + suffix); await wait()
    }
    await window.api.saveFile(root + '/docs/verification/keyword-values-ui-result.txt', 'PASS: cn/en/jp/kr value preview, icon, tooltip, numeric autocomplete/cursor, selected parameter editing, literal rich text and spaces, selection-only replacement, XML entity round-trip; no parser warnings.')
  } finally {
    for (const [path, original] of originals) await window.api.saveFile(path, original)
    for (const key of Object.keys(localStorage)) if (!(key in saved)) localStorage.removeItem(key)
    for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value)
  }
})()
