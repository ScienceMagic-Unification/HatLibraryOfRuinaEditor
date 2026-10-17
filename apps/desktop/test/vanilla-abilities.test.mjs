import { describe, expect, it } from 'vitest'
import { parseXml } from '../../../packages/editor-core/src/index'
import { bookReferenceTarget, localizedAbility, resolveBookReference, vanillaAbilities } from '../src/renderer/src/lib/vanillaAbilities'
import { cardInfoModule, cardNameModule, passiveModule } from '../../../packages/schemas/src/index'
import { vanillaModules } from '../../../packages/schemas/src/vanilla'

describe('BaseMod ability snapshot and book references', () => {
  it('routes origin to read-only catalogs and Mod references to the exact containing document', () => {
    const makeDoc = (path, module, xml) => ({ path, root: null, doc: parseXml(xml), bindings: { [module.id]: { kind: 'primary' } } })
    const docs = {
      wrong: makeDoc('CardInfo_A.xml', cardInfoModule, '<DiceCardXmlRoot><Card ID="99"/></DiceCardXmlRoot>'),
      right: makeDoc('CardInfo_B.xml', cardInfoModule, '<DiceCardXmlRoot><Card ID="107"/></DiceCardXmlRoot>'),
      names: { ...makeDoc('cn/Names.xml', cardNameModule, '<BattleCardDescRoot><cardDescList><BattleCardDesc ID="108"><LocalizedName>Name only</LocalizedName></BattleCardDesc></cardDescList></BattleCardDescRoot>'), lang: 'cn' },
      passive: makeDoc('PassiveList.xml', passiveModule, '<PassiveXmlRoot><Passive ID="12"/></PassiveXmlRoot>')
    }
    const modules = [...vanillaModules, cardInfoModule, cardNameModule, passiveModule]
    expect(bookReferenceTarget(docs, modules, 'card', '107', '', 'cn')).toMatchObject({ moduleId: 'cardinfo', path: 'CardInfo_B.xml', id: '107' })
    expect(bookReferenceTarget(docs, modules, 'card', '108', '', 'cn')).toMatchObject({ moduleId: 'cardname', path: 'cn/Names.xml' })
    expect(bookReferenceTarget(docs, modules, 'passive', '12', '@origin', 'en')).toEqual({ moduleId: 'vanilla-passives', id: '12', language: 'en' })
    expect(bookReferenceTarget(docs, modules, 'card', '703001', '@origin', 'cn')).toEqual({ moduleId: 'vanilla-cards', id: '703001', language: 'cn' })
    expect(bookReferenceTarget(docs, modules, 'passive', '12', 'Other.Mod', 'cn')).toBeUndefined()
    expect(bookReferenceTarget(docs, modules, 'card', '999999999', '@origin', 'cn')).toBeUndefined()
    expect(vanillaAbilities.find((e) => e.kind === 'card' && e.id === '703001').xml).toContain('BehaviourList')
  })
  it('includes three languages and original passive data plus card names', () => {
    const passive = vanillaAbilities.find((e) => e.kind === 'passive' && e.id === '1')
    expect(localizedAbility(passive, 'cn')).toMatchObject({ name: '斩击强化1', desc: '25%的概率使斩击伤害+1' })
    expect(passive.text.en.name).toBeTruthy()
    expect(passive.text.jp.name).toBeTruthy()
    expect(passive.fields.Level).toBe('1')
    expect(vanillaAbilities.filter((e) => e.kind === 'ability').length).toBeGreaterThan(600)
    expect(resolveBookReference({}, 'card', '703001', '@origin', 'cn').name).toBe('崩坏序曲')
  })
  it('resolves Mod localization separately from origin and never guesses other packages', () => {
    const docs = {
      data: { root: null, doc: parseXml('<PassiveXmlRoot><Passive ID="1"><Cost>4</Cost><Name>Fallback</Name><Desc>Raw</Desc></Passive></PassiveXmlRoot>') },
      cn: { root: 'PassiveDescRoot', lang: 'cn', doc: parseXml('<PassiveDescRoot><PassiveDesc ID="1"><Name>模组被动</Name><Desc>模组描述</Desc></PassiveDesc></PassiveDescRoot>') },
      en: { root: 'PassiveDescRoot', lang: 'en', doc: parseXml('<PassiveDescRoot><PassiveDesc ID="1"><Name>Mod passive</Name><Desc>Mod effect</Desc></PassiveDesc></PassiveDescRoot>') }
    }
    expect(resolveBookReference(docs, 'passive', '1', '', 'cn')).toMatchObject({ name: '模组被动', desc: '模组描述', fields: { Cost: '4' } })
    expect(resolveBookReference(docs, 'passive', '1', '', 'en').name).toBe('Mod passive')
    expect(resolveBookReference(docs, 'passive', '1', '@origin', 'cn').name).toBe('斩击强化1')
    expect(resolveBookReference(docs, 'passive', '1', 'Other.Mod', 'cn')).toBeUndefined()
    expect(resolveBookReference(docs, 'passive', '999999999', '@origin', 'cn')).toBeUndefined()
  })
})
