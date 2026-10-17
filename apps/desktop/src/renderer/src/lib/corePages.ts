import { findChildNode, getAttr, getNodeText, getTextField, makeElement, nodeChildren, setAttr, type OrderedNode } from '@ruina/editor-core'

export const isCorePage = (id: string): boolean => /^equippage-(enemy|librarian)(@|$)/.test(id)
export function corePageModuleForFile(path: string): string | undefined {
  const name = path.split(/[\\/]/).pop() ?? ''
  const match = /^EquipPage_(Enemy|Librarian)(?:[._ -]|$)/i.exec(name)
  return match ? `equippage-${match[1].toLowerCase()}` : undefined
}
export const resistanceRates: Record<string, number> = { None: 1, Normal: 1, Weak: 2, Vulnerable: 1.5, Endure: 0.5, Resist: 0.25, Immune: 0 }
export const corePageGroups = [
  { key: 'identity', fields: ['Name', 'Rarity', 'Chapter', 'RangeType', 'Option'] },
  { key: 'stats', fields: ['HP', 'Break', 'SpeedMin', 'Speed', 'SpeedDiceNum', 'MaxPlayPoint', 'StartPlayPoint', 'AddedStartDraw'] },
  { key: 'resistance', fields: ['SResist', 'SBResist', 'PResist', 'PBResist', 'HResist', 'HBResist'] },
  { key: 'appearance', fields: ['CharacterSkin', 'CharacterSkinType', 'SkinGender', 'BookIcon', 'RandomFace', 'NotEquip', 'SuccessionPossibleNumber', 'Category'] },
  { key: 'advanced', fields: ['TextId', 'Episode', 'HpReduction', 'DeadLine', 'EquipSpeedDiceNum'] }
] as const

export function referenceNodes(book: OrderedNode, name: string): OrderedNode[] {
  const effect = findChildNode(book, 'EquipEffect')
  return effect ? nodeChildren(effect).filter((n): n is OrderedNode => Boolean(n && typeof n === 'object' && name in n)) : []
}
/** Edit only the chosen reference; retain package IDs, unknown attributes and adjacent extension nodes. */
export function editReference(book: OrderedNode, name: string, index: number, patch: Record<string, string> | 'add' | 'delete'): void {
  let effect = findChildNode(book, 'EquipEffect')
  if (!effect) { effect = makeElement('EquipEffect'); nodeChildren(book).push(effect) }
  const children = nodeChildren(effect)
  const rows = referenceNodes(book, name)
  if (patch === 'add') { children.push(makeElement(name, undefined, '0')); return }
  const row = rows[index]
  if (!row) return
  if (patch === 'delete') { children.splice(children.indexOf(row), 1); return }
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id') {
      const text = nodeChildren(row).find((n) => n && typeof n === 'object' && '#text' in n) as Record<string, unknown> | undefined
      if (text) text['#text'] = value
      else nodeChildren(row).push({ '#text': value })
    } else setAttr(row, key, value || undefined)
  }
}
export function corePageProblems(book: OrderedNode): string[] {
  const effect = findChildNode(book, 'EquipEffect')
  const problems: string[] = []
  if (!effect) return problems
  const min = getTextField(effect, 'SpeedMin'), max = getTextField(effect, 'Speed')
  if (min && max && Number(min) > Number(max)) problems.push('speedOrder')
  for (const name of ['Passive', 'OnlyCard', 'Card']) if (referenceNodes(book, name).some((n) => !/^\d+$/.test(getNodeText(n)))) problems.push('referenceId')
  return [...new Set(problems)]
}
export const referenceLabel = (node: OrderedNode): string => `${getAttr(node, 'Pid') ? getAttr(node, 'Pid') + ':' : ''}${getNodeText(node)}`
