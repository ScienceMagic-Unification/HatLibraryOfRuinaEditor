/** Catalog/search aliases only. Never rewrite saved user documents during loading or rendering. */
export const keywordMigrations: Record<string, string> = {
  Hat_Enchantments_DiscoverCard_Keyword: 'Hat_Enchantments_BrowseCard_Keyword',
  DreamUniverse_Insight_Keyword: 'Hat_Enchantments_Precision_Keyword',
  DreamUniverse_MultipleHit_Keyword: 'Hat_Enchantments_MultipleHit_Keyword',
  DreamUniverse_Harmonious_Keyword: 'Hat_Enchantments_Harmonious_Keyword'
}
export const keywordSearchAliases = (id: string): string[] => Object.entries(keywordMigrations).filter(([, replacement]) => replacement === id).map(([previous]) => previous)
