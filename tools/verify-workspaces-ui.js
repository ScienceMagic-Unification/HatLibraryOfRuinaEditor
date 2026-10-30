(async () => {
  const root = window.__workspaceTestRoot, store = window.__store
  const saved = { ...localStorage }, originals = new Map()
  const wait = () => new Promise((resolve) => setTimeout(resolve, 160))
  const check = (condition, message) => { if (!condition) throw new Error(message) }
  const input = (el, value) => {
    check(el, 'Input exists')
    Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const state = () => store.getState()
  const module = (id) => state().modules.find((item) => item.id === id)
  const docs = (id) => Object.values(state().docs).filter((doc) => doc.bindings[id]?.kind === 'primary')
  const currentDoc = (id) => docs(id).find((doc) => doc.path === state().primaryDocPath[id]) ?? docs(id)[0]
  const refs = (id) => window.__debug.listEntities(currentDoc(id).doc, module(id).entity)
  const select = async (id) => { await state().setActiveModule(id); state().select(id, refs(id)[0].id); await wait() }
  const blur = (el) => { el.blur(); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })) }
  const key = async (el, name) => { el.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true })); await wait() }
  const click = async (label) => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.trim() === label)
    check(button, 'Button ' + label); button.click(); await wait()
  }
  try {
    await state().openMod(root + '/docs/verification/workspaces-mod')
    const manifest = JSON.parse(await window.api.readTextFile(root + '/docs/verification/workspaces-mod/manifest.json'))
    for (const item of manifest) {
      check(module(item.id), 'Discovered ' + item.id)
      await select(item.id)
      for (const doc of docs(item.id)) originals.set(doc.path, await window.api.readTextFile(doc.path))
      check(document.querySelector('[data-testid="schema-preview"]'), 'Shared preview ' + item.id)
      check(document.querySelector('[data-testid="entity-id-input"]'), 'Shared form ' + item.id)
      check(!document.body.innerText.includes('workspace.preview'), 'Translated preview title')
      check(document.querySelectorAll('input,textarea').length > 1, 'Editable fields ' + item.id)
    }
    await select('cardinfo')
    for (const doc of docs('cardinfo')) originals.set(doc.path, await window.api.readTextFile(doc.path))
    const cardDoc = docs('cardinfo').find((doc) => /[\\/]cards\.xml$/.test(doc.path))
    state().setPrimaryDoc('cardinfo', cardDoc.path); state().setPrimaryLang('cardinfo', cardDoc.lang ?? cardDoc.path); state().select('cardinfo', '3'); await wait()
    let idInput = document.querySelector('[data-testid="entity-id-input"]')
    const revision = currentDoc('cardinfo').rev
    idInput.focus(); input(idInput, '2'); await wait()
    check(state().selectedId.cardinfo === '3' && refs('cardinfo').map((ref) => ref.id).join(',') === '2,3', 'Partial 2 does not rename or navigate')
    check(currentDoc('cardinfo').rev === revision, 'Partial ID does not dirty history')
    input(idInput, '21'); await wait(); check(state().selectedId.cardinfo === '3', 'Full draft waits for commit')
    await key(idInput, 'Enter')
    check(state().selectedId.cardinfo === '21' && refs('cardinfo').map((ref) => ref.id).join(',') === '2,21', 'Enter commits complete 21: ' + JSON.stringify({ selected: state().selectedId.cardinfo, ids: refs('cardinfo').map((r) => r.id), input: idInput.value, connected: idInput.isConnected, active: document.activeElement?.tagName, doc: currentDoc('cardinfo').path }))
    check(currentDoc('cardinfo').rev === revision + 1, 'Rename is one undo step')
    idInput = document.querySelector('[data-testid="entity-id-input"]'); idInput.focus(); input(idInput, '2'); await key(idInput, 'Enter')
    check(state().selectedId.cardinfo === '21' && document.querySelector('[data-testid="entity-id-input"]').value === '21', 'Duplicate ID rejected and draft restored')
    idInput = document.querySelector('[data-testid="entity-id-input"]'); idInput.focus(); input(idInput, '8'); await key(idInput, 'Escape')
    check(state().selectedId.cardinfo === '21' && idInput.value === '21', 'Escape cancels')
    idInput.focus(); input(idInput, ''); blur(idInput); await wait()
    check(refs('cardinfo').every((ref) => ref.id), 'Empty ID rejected')
    idInput.focus(); input(idInput, '22'); blur(idInput); await wait()
    check(state().selectedId.cardinfo === '22', 'Blur commits')
    state().undo(); await wait()
    check(refs('cardinfo').some((ref) => ref.id === '21') && state().selectedId.cardinfo === '21', 'Undo restores complete prior ID and selection')
    state().redo(); await wait()
    check(state().selectedId.cardinfo === '22', 'Redo keeps renamed record selected')
    await state().saveModule('cardinfo')
    check((await window.api.readTextFile(cardDoc.path)).includes('ID="22"'), 'Committed ID saved')
    await click('简易')
    idInput = document.querySelector('[data-testid="entity-id-input"]')
    check(idInput?.value === '22', 'Brief view uses shared ID editor')
    input(idInput, '2'); await wait(); check(state().selectedId.cardinfo === '22', 'Brief view keeps partial ID private')
    input(idInput, '23'); await key(idInput, 'Enter'); check(state().selectedId.cardinfo === '23', 'Brief view commits complete ID')
    await click('详细')
    // A new document with the same selected ID must not inherit the previous draft.
    state().select('cardinfo', '3'); const other = docs('cardinfo').find((doc) => /cards-other/.test(doc.path))
    state().setPrimaryDoc('cardinfo', other.path); await wait()
    check(document.querySelector('[data-testid="entity-id-input"]').value === '3', 'Document switch resets draft')

    await select('stage')
    let unitInput = document.querySelector('[data-list-field="Unit"] input[aria-label="ID"]')
    input(unitInput, '21'); await wait()
    check(document.querySelector('[data-testid="schema-preview"]').textContent.includes('21'), 'Nested unit preview updates')
    await state().saveModule('stage')
    let xml = new DOMParser().parseFromString(await window.api.readTextFile(currentDoc('stage').path), 'text/xml')
    check(xml.querySelector('Stage Wave Unit').textContent === '21', 'Nested unit saved')
    check(xml.querySelectorAll('Stage:first-child Wave Unit').length === 3, 'Duplicate enemies retained')
    const count = refs('stage').length
    await click('复制'); check(refs('stage').length === count + 1, 'Clone reception')
    await click('删除'); check(refs('stage').length === count, 'Delete reception clone')
    await click('新增'); check(refs('stage').length === count + 1, 'Create reception')
    await click('删除'); check(refs('stage').length === count, 'Delete new reception')

    await click('源码')
    const source = document.querySelector('textarea')
    check(source?.value.includes('<Stage id='), 'Reception source view')
    input(source, source.value.replace('</Stage>', '<Extension Keep="yes"/></Stage>')); await wait()
    await click('应用'); await click('详细')
    await state().saveModule('stage')
    xml = new DOMParser().parseFromString(await window.api.readTextFile(currentDoc('stage').path), 'text/xml')
    check(xml.querySelector('Stage Extension')?.getAttribute('Keep') === 'yes', 'Source and form preserve extension nodes')

    await select('character-stage-names')
    const nameInput = [...document.querySelectorAll('input')].find((el) => el.value === refs('character-stage-names')[0].node.Name.find((child) => '#text' in child)['#text'])
    input(nameInput, '测试名称 & <保留>'); await wait(); await state().saveModule('character-stage-names')
    xml = new DOMParser().parseFromString(await window.api.readTextFile(currentDoc('character-stage-names').path), 'text/xml')
    check(xml.querySelector('Name').textContent === '测试名称 & <保留>' && !xml.querySelector('Name Text'), 'Direct text saved with correct shape')

    await select('battledialog')
    input(document.querySelector('[data-document-field="GroupName"] input'), 'TestGroup'); await wait()
    input(document.querySelector('[data-list-field="BattleDialog"] textarea'), '测试对白 [烧伤]'); await wait()
    await state().saveModule('battledialog')
    xml = new DOMParser().parseFromString(await window.api.readTextFile(currentDoc('battledialog').path), 'text/xml')
    check(xml.querySelector('GroupName').textContent === 'TestGroup', 'Root dialogue group saved')
    check(xml.querySelector('BattleDialog').textContent === '测试对白 [烧伤]', 'Nested dialogue saved')
    check(xml.querySelector('BattleDialog').getAttribute('ID') === 'START_BATTLE_0', 'Dialogue ID retained')
    await select('stage')
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await window.api.saveFile(root + '/docs/verification/workspaces-ui-result.txt', 'PASS: 14 new workspaces and enemy form/preview; partial 2 to 21, duplicate rejection, Escape, blank, blur, undo and document switch; reception nested edit/CRUD; direct name text; root dialogue group and nested dialogue; XML save/reload.')
  } finally {
    for (const [path, original] of originals) await window.api.saveFile(path, original)
    for (const name of Object.keys(localStorage)) if (!(name in saved)) localStorage.removeItem(name)
    for (const [name, value] of Object.entries(saved)) localStorage.setItem(name, value)
  }
})()
