(async () => {
  const state = () => window.__store.getState()
  const root = window.__sourceTestMod
  const longId = 'DreamUniverse_FullStopOffice_AdditionalLightOnTheNextScene_Ability'
  const pause = () => new Promise((resolve) => setTimeout(resolve, 160))
  const check = (ok, msg) => { if (!ok) throw new Error(msg + '\n' + document.body.innerText.slice(-1400)) }
  const buttons = (el = document) => [...el.querySelectorAll('button')]
  const click = async (el, label) => { check(el, 'Missing ' + label); el.click(); await pause() }
  const action = (name, scope) => click(buttons(scope).find((b) => b.textContent.trim() === name), name)
  const named = (name) => click(buttons().find((b) => b.getAttribute('aria-label') === name), name)
  const bar = () => document.querySelector('section[aria-label="条目标注"]')
  const dialog = () => document.querySelector('dialog[open]')
  const rows = () => [...document.querySelectorAll('[data-scrollkey="cardability"] .cursor-pointer')]
  const input = async (el, value) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    await pause()
  }
  const openCombined = async () => {
    const trigger = document.querySelector('[role=combobox][title]')
    trigger.focus()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await pause()
    const opts = [...document.querySelectorAll('[role=option]')]
    for (const faction of ['FullStopOffice','Index']) {
      const opt = opts.find((o) => o.title.endsWith('__' + faction + '.xml'))
      check(opt?.textContent.startsWith(faction) && opt.textContent.includes('Hat_BattleCardAbilities_cn__' + faction), 'distinct and full source name ' + faction)
    }
    const opt = opts.find((o) => o.textContent.includes('统合视图 · 简体中文'))
    opt.focus(); opt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await pause()
  }
  await state().openMod(root)
  await state().setActiveModule('cardability')
  await pause()
  await openCombined()
  const record = (name) => rows().find((r) => r.title.includes('__' + name + '.xml') && r.textContent.includes(longId))
  await click(record('FullStopOffice'), 'FullStopOffice')
  if (window.__verifyReload) {
    check(bar()?.querySelector('[aria-pressed=true]')?.textContent === '待实装', 'default assignment after restart')
    check(buttons(bar()).find((b) => b.textContent === '复核')?.getAttribute('aria-pressed') === 'true', 'custom tag after restart')
    const saved = JSON.parse(localStorage.getItem('ruina.annotations.v1')).state.projects
    check(Object.values(saved)[0].tags.some((tag) => tag.name === '复核' && tag.color === '#ee7722'), 'persisted color')
    await click(record('Index'), 'same ID, other source')
    check(!bar().querySelector('[aria-pressed=true]'), 'no tag bleed across sources')
    await state().openMod(root + '-other')
    await state().setActiveModule('cardinfo'); await pause()
    check(!buttons(bar()).some((b) => b.textContent === '复核') && !bar().querySelector('[aria-pressed=true]'), 'separate Mod annotations')
    await state().openMod(root)
    await state().setActiveModule('cardability'); await pause()
    await openCombined(); await click(record('FullStopOffice'), 'selected record')
    await window.api.saveFile(root + '/../result.txt', 'PASS: source captions, complete ID, toggle, default and custom tags, colors, assignments, filtered lookup and navigation, rename/undo, per-source identity and restart persistence.')
    return
  }
  check(!bar(), 'mode starts off')
  await action('标注模式')
  for (const label of ['已完成','待实装','待敲定','占位符']) check(buttons(bar()).some((b) => b.textContent === label), 'default tag ' + label)
  await action('待实装', bar())
  await named('管理标签')
  await action('新建标签', dialog())
  await input(dialog().querySelector('input[aria-label="标签名称"]'), '复核')
  await input(dialog().querySelector('input[type=color]'), '#ee7722')
  await action('应用', dialog())
  await named('关闭')
  await action('复核', bar())
  const marked = record('FullStopOffice')
  const text = [...marked.querySelectorAll('span')].find((e) => e.textContent === longId)
  check(text && text.scrollWidth <= text.clientWidth + 1 && text.getBoundingClientRect().bottom <= marked.getBoundingClientRect().bottom, 'full ID fits inside row')
  await click(record('Index'), 'Index')
  check(!bar().querySelector('[aria-pressed=true]'), 'separate source')
  await action('复核', marked)
  const hits = buttons(dialog()).filter((b) => b.textContent.includes(longId))
  check(hits.length === 1, 'one-click lookup')
  await click(hits[0], 'result')
  check(state().primaryDocPath.cardability.endsWith('__FullStopOffice.xml') && state().selectedId.cardability === longId, 'result opens exact source')
  const inputId = [...document.querySelectorAll('input')].find((e) => e.value === longId)
  await input(inputId, 'Renamed_For_Test')
  inputId.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await pause()
  check(buttons(bar()).find((b) => b.textContent === '复核')?.getAttribute('aria-pressed') === 'true', 'rename keeps assignments')
  state().undo(); await pause()
  check(state().selectedId.cardability === longId && buttons(bar()).find((b) => b.textContent === '复核')?.getAttribute('aria-pressed') === 'true', 'undo restores assignments')
  for (const module of ['cardinfo','passive','vanilla-cards','singularity-abilities']) {
    await state().setActiveModule(module); await pause()
    await action('已完成', bar())
  }
  await named('标签检索')
  await click(buttons(dialog()).find((b) => b.textContent.startsWith('已完成 ·')), 'global tag')
  check(buttons(dialog()).some((b) => b.textContent.includes('Passive Nine')) && buttons(dialog()).some((b) => b.textContent.includes('Base')), 'cross-workspace results')
  await named('关闭')
  await action('标注模式'); check(!bar(), 'toggle off')
  await action('标注模式')
  check(!(await window.api.readTextFile(state().primaryDocPath.cardability)).includes('复核'), 'editor metadata stays outside XML')
})()
