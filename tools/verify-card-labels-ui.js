(async () => {
  const root = window.__sourceTestMod
  const state = () => window.__store.getState()
  const wait = () => new Promise((done) => setTimeout(done, 150))
  const check = (ok, message) => { if (!ok) throw new Error(message) }
  const locales = {
    cn: ['佚亡', '群体攻击-清算', '群体攻击-交锋', '远程', '佚亡'],
    en: ['Single-use', 'Mass-Summation', 'Mass-Individual', 'Ranged', 'Single-use'],
    jp: ['消滅', '広域-合算', '広域-個別', '遠距離', '使い捨て'],
    kr: ['소멸', '광역-합산', '광역-개별', '원거리', '일회성']
  }
  const assertKeyword = (id, name) => {
    const node = document.querySelector('[data-keyword-id="' + id + '"]')
    check(node?.textContent === name && node.querySelector('img')?.naturalWidth > 0, id + ' should display ' + name + ', got ' + node?.textContent)
  }
  await state().openMod(root)
  state().setHatEnabled(true)
  await state().setActiveModule('cardinfo')
  await state().ensureModuleDocs('cardability')
  for (const [language, [exhaust, sum, individual, ranged, native]] of Object.entries(locales)) {
    const doc = Object.values(state().docs).find((d) => d.lang === language && d.bindings.cardability?.kind === 'primary')
    state().setPrimaryDoc('cardability', doc.path)
    state().setPrimaryLang('cardability', language)
    for (const [id, range] of [['9', sum], ['10', individual]]) {
      state().select('cardinfo', id); await wait()
      assertKeyword('ExhaustOnUse_Keyword', exhaust)
      assertKeyword('Origin_Range_FarArea', range)
      check([...document.querySelectorAll('img')].some((img) => img.alt === range), 'Range badge ' + range)
    }
    state().setHatEnabled(false); await wait()
    check(document.body.innerText.includes(native) && document.body.innerText.includes(individual), 'Native prefixes ' + language)
    state().setHatEnabled(true); state().select('cardinfo', '11'); await wait()
    check([...document.querySelectorAll('img')].some((img) => img.alt === ranged), 'Ordinary range ' + language)
    check(!document.querySelector('[data-keyword-id="ExhaustOnUse_Keyword"]'), 'Normal page must not show Exhaust')
  }
  // Editor controls use the interface language while the selected ability document stays Korean.
  state().select('cardinfo', '9'); await wait()
  for (const [option, locale] of [['English', 'en'], ['日本語', 'jp'], ['中文', 'cn']]) {
    const trigger = document.querySelector('[role="combobox"][aria-label="语言"], [role="combobox"][aria-label="Language"], [role="combobox"][aria-label="言語"]')
    trigger.focus(); trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await wait()
    const item = [...document.querySelectorAll('[role="option"]')].find((el) => el.textContent === option)
    item.focus(); item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait()
    const buttons = [...document.querySelectorAll('button')].map((el) => el.textContent.trim())
    check(locales[locale].slice(0, 3).every((label) => buttons.includes(label)), 'Card option and range controls ' + locale)
    assertKeyword('ExhaustOnUse_Keyword', locales.kr[0])
  }
  await state().setActiveModule('vanilla-cards')
  for (const language of ['cn', 'en', 'jp']) {
    state().setPrimaryLang('vanilla-cards', language)
    for (const [id, range] of [['704007', locales[language][1]], ['1100005', locales[language][2]]]) {
      state().select('vanilla-cards', id); await wait()
      assertKeyword('ExhaustOnUse_Keyword', locales[language][0])
      assertKeyword('Origin_Range_FarArea', range)
    }
  }
  state().setPrimaryLang('vanilla-cards', 'trcn')
  state().select('vanilla-cards', '704007'); await wait()
  assertKeyword('ExhaustOnUse_Keyword', '佚亡')
  assertKeyword('Origin_Range_FarArea', '群體攻擊-清算')
  state().setHatEnabled(false)
  state().setPrimaryLang('vanilla-cards', 'en')
  state().select('vanilla-cards', '703116'); await wait()
  const details = document.querySelector('[data-testid="vanilla-card-details"]')
  check(details.innerText.includes('If target has 10 or more Burn') && details.querySelector('img').naturalWidth > 100, 'Vanilla per-die translation and artwork')
  await state().setActiveModule('cardinfo')
  const en = Object.values(state().docs).find((d) => d.lang === 'en' && d.bindings.cardability?.kind === 'primary')
  state().setPrimaryDoc('cardability', en.path)
  state().setPrimaryLang('cardability', 'en')
  state().select('cardinfo', '12'); await wait()
  const art = document.querySelector('img[alt="Vanilla artwork probe"]')
  check(art?.naturalWidth > 100, 'Mod page resolves original artwork by key')
  check(/restore 1 light/i.test(document.body.innerText) && document.body.innerText.includes('If target has 10 or more Burn'), 'Mod preview resolves original page and die scripts with Hat disabled')
  art.click(); await wait()
  const galleryKey = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase() === 'ch1_1')
  check(galleryKey, 'Native art picker offers game key')
  galleryKey.click()
  for (let i = 0; i < 20 && !(document.querySelector('img[alt="Vanilla artwork probe"]')?.naturalWidth > 100); i++) await wait()
  check(state().activeModuleId === 'cardinfo' && document.querySelector('img[alt="Vanilla artwork probe"]')?.naturalWidth > 100, 'Native picker returns to card preview: ' + [state().activeModuleId, state().selectedId.cardinfo, document.body.innerText.slice(-900)])
  const die = [...document.querySelectorAll('.cursor-pointer')].find((el) => el.innerText.includes('If target has 10 or more Burn'))
  die.click(); await wait()
  check(state().activeModuleId === 'vanilla-abilities' && state().selectedId['vanilla-abilities'] === 'philip_courage_atk', 'Preview opens native die ability')
  await state().setActiveModule('cardinfo')
  state().select('cardinfo', '13')
  for (let i = 0; i < 20 && !document.querySelector('img[alt="Mod image override"]')?.naturalWidth; i++) await wait()
  const override = document.querySelector('img[alt="Mod image override"]')
  check(override?.naturalWidth === 1 && override.src.startsWith('data:image/png'), 'Same-name Mod image takes precedence')
  override.click(); await wait()
  check([...document.querySelectorAll('button')].find((b) => b.textContent === 'Mod')?.getAttribute('aria-pressed') === 'true', 'Mod override opens the Mod image tab')
  await window.api.saveFile(root + '/../result.txt', 'PASS: localized labels, native artwork and picker, per-card and shared native descriptions, ability navigation.')
})()
