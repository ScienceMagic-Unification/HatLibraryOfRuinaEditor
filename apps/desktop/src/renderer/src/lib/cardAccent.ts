import type { OrderedNode } from '@ruina/editor-core'
import { getMulti, getTextField } from '@ruina/editor-core'
import { rarityMeta } from '@ruina/schemas'

/**
 * 卡牌主题色：稀有度颜色；
 * 特性中包含 EGO（EGO/EgoPersonal/EgoChange 等）时统一使用 EGO 红 #C61231。
 */
export function cardAccent(node: OrderedNode): string | undefined {
  const traits = getMulti(node, 'Option')
  if (traits.some((t) => /ego/i.test(t))) return '#C61231'
  const rarity = getTextField(node, 'Rarity') ?? ''
  return rarityMeta[rarity]?.color
}