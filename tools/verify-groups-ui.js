(async () => {
  const root = window.__sourceTestMod, state = () => window.__store.getState()
  const wait = () => new Promise((r) => setTimeout(r, 140))
  const check = (ok, msg) => { if (!ok) throw new Error(msg + '\n' + document.body.innerText.slice(-1200)) }
  const all = (q) => [...document.querySelectorAll(q)]
  const btn = (name) => all('button').find((b) => b.textContent.trim() === name)
  const click = async (el, name) => { check(el, 'Missing ' + name); el.click(); await wait() }
  const drag = async (src, dst, after = false) => {
    check(src && dst, 'Missing drag source/target')
    const dt = new DataTransfer(), rect = dst.getBoundingClientRect()
    for (const [node, type] of [[src,'dragstart'],[dst,'dragover'],[dst,'drop'],[src,'dragend']])
      node.dispatchEvent(new DragEvent(type,{ dataTransfer: dt, bubbles: true, cancelable: true, clientY: rect.top + (after ? rect.height - 1 : 1) }))
    await wait()
  }
  const row = (id) => all('[data-group-row]').find((e) => e.dataset.groupRow === id)
  const select = async (el, modifiers = {}) => {
    check(el, 'Missing selectable row')
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, ...modifiers })); await wait()
  }
  const selected = () => all('[data-group-row][data-selected="true"]').map((el) => el.dataset.groupRow)
  const heads = () => all('[data-group]'), head = (suffix) => heads().find((e) => e.dataset.group.endsWith(suffix))
  const groupBtn = (h) => h?.querySelector('[aria-expanded]')
  const members = (h) => {
    const result = []
    for (let next = h?.nextElementSibling; next?.hasAttribute('data-group-row'); next = next.nextElementSibling) result.push(next.dataset.groupRow)
    return result
  }
  const setInput = async (el, value) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true })); await wait()
  }
  const combined = async () => {
    const trigger = document.querySelector('[role=combobox][title]')
    trigger.focus(); trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await wait()
    const opt = all('[role=option]').find((e) => e.textContent.includes('统合视图 · 简体中文'))
    opt.focus(); opt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait()
  }
  await state().openMod(root); await state().setActiveModule('cardinfo'); await wait()
  const cards = root + '/Data/CardInfo.xml', original = await window.api.readTextFile(cards)
  const groupNamed = (name) => heads().find((h) => groupBtn(h)?.textContent.startsWith(name))
  if (window.__verifyReload) {
    const h = groupNamed('第一组')
    check(h && groupBtn(h).getAttribute('aria-expanded') === 'false', 'manual group and fold survive restart')
    await click(groupBtn(h), 'expand')
    check(members(groupNamed('第一组')).join() === '9,21', 'manual order survives restart')
    await state().setActiveModule('cardability'); await wait(); await combined()
    check(heads()[0].dataset.group.endsWith('Hat_Alpha.xml') && members(head('Hat_Alpha.xml')).join() === 'SplitOnly,Shared', 'file order and transferred XML after restart')
    await window.api.saveFile(root + '/../result.txt', 'PASS: file and manual group drag, fold, search, conflict refusal, linked save and undo/redo, annotations, staged save failure, restart and physical XML verification.')
    return
  }
  await click(btn('标注模式'), 'annotations'); await click(btn('分组'), 'card groups')
  await click(row('9').querySelector('.cursor-pointer'), 'select card')
  await click(document.querySelector('section[aria-label="条目标注"] button[aria-pressed="false"]'), 'tag card')
  check(row('9').innerText.includes('已完成'), 'CardInfo tag visible in grouped list')
  await click(btn('新建分组'), 'create group'); await setInput(document.querySelector('input[aria-label="分组名称"]'), '第一组'); await click(btn('确定'), 'confirm')
  await select(row('9')); await select(row('32'), { shiftKey: true })
  check(selected().join() === '9,21,30,32', 'shift selects displayed range')
  await select(row('21'), { ctrlKey: true })
  check(selected().join() === '9,30,32', 'ctrl toggles just one row')
  await drag(row('30'), groupNamed('第一组'))
  check(members(groupNamed('第一组')).join() === '9,30,32' && row('9').innerText.includes('已完成'), 'manual batch preserves order and tag')
  await click(row('9').querySelector('button'), 'grouped tag lookup')
  check(document.querySelector('dialog[open]'), 'chip still opens tag lookup')
  await click(document.querySelector('dialog[open] [aria-label="关闭"]'), 'close lookup')
  await select(row('9')); await select(row('32'), { shiftKey: true })
  await drag(row('9'), head('__ungrouped__'))
  await select(row('9'))
  await drag(row('9'), groupNamed('第一组')); await drag(row('21'), row('9'))
  check(members(groupNamed('第一组')).join() === '9,21', 'manual membership and order')
  await click(groupBtn(groupNamed('第一组')), 'collapse')
  check(!row('9') && (await window.api.readTextFile(cards)) === original && !Object.values(state().docs).some((d) => d.path.endsWith('CardInfo.xml') && d.dirty), 'CardInfo stays intact')
  await state().setActiveModule('cardability'); await wait(); await combined(); await click(btn('分组'), 'source groups')
  const a = head('Hat_Alpha.xml').dataset.group, b = head('Beta_cn.xml').dataset.group
  await drag(head('Hat_Alpha.xml'), head('Beta_cn.xml'))
  check(heads()[0].dataset.group === a, 'file group order')
  await click(groupBtn(head('Beta_cn.xml')), 'fold B')
  const search = all('input').find((e) => e.placeholder.includes('搜索 ID'))
  await setInput(search, 'SplitOnly'); check(row('SplitOnly'), 'find in folded source')
  await setInput(search, ''); check(!row('SplitOnly'), 'search does not change saved fold state')
  await click(groupBtn(head('Beta_cn.xml')), 'open B')
  await click(row('SplitOnly').querySelector('.cursor-pointer'), 'select'); await click(btn('待实装'), 'assign tag')
  const gamma = head('Gamma.xml').dataset.group
  const sharedB = head('Beta_cn.xml').nextElementSibling
  await select(row('SplitOnly')); await select(sharedB, { ctrlKey: true })
  const beforeConflict = [a,b,gamma].map((path) => state().docs[path].rev)
  await drag(row('SplitOnly'), head('Hat_Alpha.xml'))
  check([a,b,gamma].every((path, i) => state().docs[path].rev === beforeConflict[i]), 'one conflict rejects whole batch')
  await select(row('SplitOnly')); await select(row('ThirdOnly'), { ctrlKey: true })
  check(selected().length === 2, 'selection spans source files')
  await drag(row('ThirdOnly'), head('Hat_Alpha.xml'))
  check(!members(head('Gamma.xml')).length && members(head('Hat_Alpha.xml')).length === 3 && selected().length === 2, 'three-file batch move')
  check(row('SplitOnly').innerText.includes('待实装'), 'batch move preserves tag')
  check(await state().saveDoc(gamma), 'save all batch participants')
  check(!(await window.api.readTextFile(gamma)).includes('ThirdOnly') && !(await window.api.readTextFile(b)).includes('SplitOnly') &&
    (await window.api.readTextFile(a)).includes('ThirdOnly'), 'multi-source XML written')
  state().undo(); await wait()
  check(members(head('Gamma.xml')).join() === 'ThirdOnly' && members(head('Beta_cn.xml')).includes('SplitOnly'), 'single undo restores three sources')
  state().redo(); await wait()
  check(members(head('Hat_Alpha.xml')).length === 3, 'single redo restores batch')
  state().undo(); await wait()
  await select(row('SplitOnly'))
  await drag(row('SplitOnly'), head('Hat_Alpha.xml'))
  check(members(head('Hat_Alpha.xml')).join() === 'Shared,SplitOnly' && members(head('Beta_cn.xml')).join() === 'Shared', 'cross-file move')
  check(state().docs[a].dirty && state().docs[b].dirty && row('SplitOnly').innerText.includes('待实装'), 'both dirty and tag migrated')
  await drag(row('Shared'), row('SplitOnly'))
  check(members(head('Hat_Alpha.xml')).join() === 'SplitOnly,Shared', 'reorder within file')
  state().undo(); await wait(); state().undo(); await wait()
  check(members(head('Beta_cn.xml')).includes('SplitOnly') && row('SplitOnly').innerText.includes('待实装'), 'undo restores both sides and tag')
  state().redo(); await wait(); state().redo(); await wait()
  const rev = state().docs[a].rev
  await drag(row('Shared'), head('Beta_cn.xml'))
  check(state().docs[a].rev === rev && state().statusKind === 'error', 'duplicate ID drop rejected')
  check(await state().saveDoc(b), 'save either participant')
  const xmlA = await window.api.readTextFile(a), xmlB = await window.api.readTextFile(b)
  check(!xmlB.includes('SplitOnly') && xmlB.includes('<!--B-->') && ['<!--A-->','custom="yes"','<!--inside-->','keep="yes"'].every((x) => xmlA.includes(x)), 'actual XML preserves unknown content')
  check(!state().docs[a].dirty && !state().docs[b].dirty, 'linked save cleared both')
  let rejected = false
  try { await window.api.saveLinkedFiles([{ path: a, content: 'never commit' }, { path: root + '/missing.xml', content: 'missing' }]) } catch { rejected = true }
  check(rejected && await window.api.readTextFile(a) === xmlA, 'stage failure leaves original intact')

  state().setHatEnabled(true)
  await state().setActiveModule('effecttext'); await wait(); await combined(); await click(btn('分组'), 'effect groups')
  const red = head('Red.xml').dataset.group, blue = head('Blue.xml').dataset.group
  await drag(row('PlainOnly'), head('Blue.xml'))
  check(await state().saveDoc(red) && !(await window.api.readTextFile(red)).includes('PlainOnly') &&
    /<effectTextList>[\s\S]*?<BattleEffectText ID="PlainOnly"/.test(await window.api.readTextFile(blue)), 'transfer creates correct nested effect container')
  await state().setActiveModule('mod-regex'); await wait(); await click(btn('分组'), 'regex groups')
  await drag(row('MoveRule'), head('Blue.xml'))
  for (let i = 0; i < 30 && state().docs[blue].dirty; i++) await wait()
  check(!(await window.api.readTextFile(red)).includes('MoveRule') && (await window.api.readTextFile(blue)).includes('keep="yes"'), 'regex group drop saves both files')
})()
