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
    check(page && page.textContent.includes('692'), 'All ability IDs available')
    await input(page.querySelector('input'), 'argaliaVibrateUp2')
    const row = [...page.querySelectorAll('[data-scrollkey="vanilla-ability"] .cursor-pointer')].find((e) => e.textContent.includes('argaliaVibrateUp2'))
    check(row, 'Search ability Script ID'); row.click(); await wait()
    check(page.querySelector('textarea').value.includes('震颤'), 'Selected original ability text')
    check(!Object.values(store.getState().docs).some((d) => d.dirty), 'Browsing never dirties Mod documents')
    await window.api.saveFile(root + '/docs/verification/vanilla-ui-result.txt', 'PASS: independent vanilla workspaces; passive details; Chinese/English/Japanese; ID/name search; original ability text; no Mod writes.')
  } finally { for (const [k, v] of Object.entries(saved)) if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) }
})()
