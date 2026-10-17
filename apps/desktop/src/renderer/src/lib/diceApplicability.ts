/** Native main-script descriptions are not granted enchantment fragments. */
export interface DicePreviewContext { type: string; detail: string; source: 'native' | 'enchantment' }
export const shieldBashAppliesTo = (dice: Pick<DicePreviewContext, 'type' | 'detail'>): boolean =>
  dice.detail === 'Guard' && (dice.type === 'Def' || dice.type === 'Standby')
/** Matches the game's IsAttackDice: counter attacks also have these details. */
export const throughoutAppliesTo = (dice: Pick<DicePreviewContext, 'detail'>): boolean =>
  ['Slash', 'Penetrate', 'Hit'].includes(dice.detail)
