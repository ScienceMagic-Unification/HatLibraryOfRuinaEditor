(async () => {
  const root = window.__keywordTestRoot, store = window.__store
  const saved = Object.fromEntries(['lastModPath', 'hatSingularityEnabled'].map((k) => [k, localStorage.getItem(k)]))
  const wait = () => new Promise((r) => setTimeout(r, 250))
  const check = (v, message) => { if (!v) throw new Error(message) }
  try {
    const manifest = JSON.parse(await window.api.readTextFile(root + '/apps/desktop/src/renderer/src/assets/plugins/manifest.json'))
    await store.getState().openMod(root + '/docs/verification/keyword-mod')
    store.getState().setHatEnabled(true)
    await store.getState().setActiveModule('builtin-images'); await wait()
    const page = document.querySelector('[data-testid="builtin-images"]')
    ;[...page.querySelectorAll('button')].find((b) => b.textContent.trim() === '奇点').click(); await wait()
    const expected = manifest.resources.filter((r) => r.kind === 'image')
    check(page.querySelectorAll('[data-resource-id]').length === expected.length, 'All embedded images are shown')
    for (let i = 0; i < 12 && [...page.querySelectorAll('img')].some((img) => !img.complete); i++) await wait()
    check([...page.querySelectorAll('img')].every((img) => img.complete && img.naturalWidth > 0), 'Every embedded image loads')
    for (const id of ['Exhaust', 'Hat_Enchantments_Ammo_Set', 'Hat_Enchantments_Insight', 'Hat_Enchantments_MultipleHit', 'Hat_Enchantments_Harmonious', 'Hat_Enchantments_ShieldBash', 'Hat_Enchantments_Throughout_Dice', 'Hat_Enchantments_UnsealDice', 'Hat_ParryingValueUp', 'TraitGlow', 'SidebarBackground']) check(page.querySelector(`[data-resource-id="${id}"]`), 'Missing resource ' + id)
    const search = page.querySelector('input')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, 'HatSingularity.Enchantments')
    search.dispatchEvent(new Event('input', { bubbles: true })); await wait()
    check(page.querySelectorAll('[data-resource-id]').length === expected.filter((r) => r.plugin === 'HatSingularity.Enchantments').length, 'Search by owning plugin')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '')
    search.dispatchEvent(new Event('input', { bubbles: true })); await wait()
    ;[...page.querySelectorAll('button')].find((b) => b.textContent.trim() === '其他').click(); await wait()
    check(page.querySelectorAll('[data-resource-id]').length === 0, 'Nine legacy copies removed from Other')
    ;[...page.querySelectorAll('button')].find((b) => b.textContent.trim() === '奇点').click(); await wait()
    for (const id of ['BP', 'Card', 'Dice', 'Emotion', 'HP', 'PlayPoint', 'Recover', 'RecoverBreak', 'Speed']) check(page.querySelector(`[data-resource-id="${id}"] img`)?.naturalWidth > 0, 'Canonical copy retained ' + id)
    await window.api.saveFile(root + '/docs/verification/plugin-images-ui-result.txt', `PASS: ${expected.length} embedded images displayed and decoded, including shield bash and Throughout; source-plugin search works; nine duplicate images removed from Other and retained under Singularity.`)
    await new Promise((r) => setTimeout(r, 1200))
  } finally {
    for (const [key, value] of Object.entries(saved)) if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value)
  }
})()
