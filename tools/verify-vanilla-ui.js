(async () => {
  const root = window.__keywordTestRoot, store = window.__store
  const saved = Object.fromEntries(['lastModPath', 'hatSingularityEnabled'].map((k) => [k, localStorage.getItem(k)]))
  const wait = () => new Promise((r) => setTimeout(r, 260))
  const check = (v, message) => { if (!v) throw new Error(message) }
  const input = async (el, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); await wait() }
  try {
    await store.getState().openMod(root + '/docs/verification/core-pages-mod')
    store.setState({ hatEnabled: false })
    await store.getState().setActiveModule('vanilla-passives'); await wait()
    let page = document.querySelector('[data-testid="vanilla-abilities"]')
    check(page && page.textContent.includes('斩击强化1'), 'Vanilla workspace independent of Hat toggle')
    check(page.textContent.includes('25%的概率使斩击伤害+1'), 'Full passive effect')
    await input(page.querySelector('input'), '斩击强化1')
    check(page.textContent.includes('斩击强化1'), 'Search by localized name')
    const language = page.querySelector('select')
    language.value = 'en'; language.dispatchEvent(new Event('change', { bubbles: true })); await wait()
    check(page.querySelector('textarea').value.includes('25%'), 'English description')
    language.value = 'jp'; language.dispatchEvent(new Event('change', { bubbles: true })); await wait()
    check(page.querySelector('textarea').value.length > 5 && !page.querySelector('textarea').value.includes('概率'), 'Japanese description')
    await store.getState().setActiveModule('vanilla-abilities'); await wait()
    page = document.querySelector('[data-testid="vanilla-abilities"]')
    check(page && page.querySelector('[data-scrollkey="vanilla-ability"]'), 'Original ability catalog available')
    await input(page.querySelector('input'), 'argaliaVibrateUp2')
    const row = [...page.querySelectorAll('[data-scrollkey="vanilla-ability"] .cursor-pointer')].find((e) => e.textContent.includes('argaliaVibrateUp2'))
    check(row, 'Search ability Script ID'); row.click(); await wait()
    check(page.querySelector('textarea').value.includes('震颤'), 'Selected original ability text')
    const snapshot = JSON.parse(await window.api.readTextFile(root + '/apps/desktop/src/renderer/src/assets/vanilla-abilities.json'))
    const colors = { Common: 'rgb(168, 242, 159)', Uncommon: 'rgb(154, 198, 250)', Rare: 'rgb(186, 151, 255)', Unique: 'rgb(255, 192, 117)' }
    for (const kind of ['card', 'passive']) {
      const moduleId = kind === 'card' ? 'vanilla-cards' : 'vanilla-passives'
      await store.getState().setActiveModule(moduleId)
      store.getState().setPrimaryLang(moduleId, 'cn')
      const candidates = snapshot.entries.filter((e) => e.kind === kind)
      const samples = Object.entries(colors).map(([rarity, color]) => ({ color, entry: candidates.find((e) => kind === 'card' ? e.xml?.includes('<Rarity>' + rarity + '</Rarity>') && !/<Option>[^<]*ego/i.test(e.xml) : e.fields.Rarity === rarity) }))
      if (kind === 'card') samples.push({ color: 'rgb(198, 18, 49)', entry: candidates.find((e) => /<Option>[^<]*ego/i.test(e.xml ?? '')) })
      for (const { entry, color } of samples) {
        check(entry, 'Rarity sample ' + kind + ' ' + color)
        store.getState().setLocalizedView('vanilla-' + kind, false)
        store.getState().select(moduleId, entry.id); await wait()
        page = document.querySelector('[data-testid="vanilla-abilities"]')
        await input(page.querySelector('input'), entry.id)
        const name = page.querySelector('[data-scrollkey="vanilla-' + kind + '"] [title="' + entry.id + '"] span[style]')
        check(name && getComputedStyle(name).color === color, 'Normal list rarity color ' + kind + ' ' + entry.id)
        const displayedName = name.textContent
        store.getState().setLocalizedView('vanilla-' + kind, true); await wait()
        const localized = [...page.querySelectorAll('[data-scrollkey="vanilla-' + kind + '"] div[style]')].find((el) => el.textContent === displayedName)
        check(localized && getComputedStyle(localized).color === color, 'Localized list rarity color ' + kind + ' ' + entry.id)
      }
    }
    check(!Object.values(store.getState().docs).some((d) => d.dirty), 'Browsing never dirties Mod documents')
    await window.api.saveFile(root + '/docs/verification/vanilla-ui-result.txt', 'PASS: native catalogs, languages, search, ability text, four rarity colors and EGO red in both list modes, no Mod writes.')
  } finally { for (const [k, v] of Object.entries(saved)) if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) }
})()
