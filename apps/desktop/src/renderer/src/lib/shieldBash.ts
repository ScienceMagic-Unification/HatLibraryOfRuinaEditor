/** Ability order wins. These are the four public built-in configurations; no priority sorting. */
export const shieldBashScripts = [
  'Hat_Enchantments_ShieldBash_Dice',
  'Hat_Enchantments_ShieldBash_Slash_Dice',
  'Hat_Enchantments_ShieldBash_Penetrate_Dice',
  'Hat_Enchantments_ShieldBash_Hit_Dice'
] as const
export const shieldBashKeywordIds = new Set<string>(shieldBashScripts.map((id) => id.replace(/_Dice$/, '_Keyword')))
export const firstShieldBashScript = (abilityIds: readonly string[]): string | undefined => abilityIds.find((id) => shieldBashScripts.some((script) => script === id))
