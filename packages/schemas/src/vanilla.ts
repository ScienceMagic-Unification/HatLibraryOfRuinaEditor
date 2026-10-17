import type { ModuleDefinition } from '@ruina/editor-core'
export const vanillaModules: ModuleDefinition[] = [
  { id: 'vanilla-cards', title: '原版战斗书页', icon: 'Swords', description: '', builtin: true, readonly: true, entity: { root: '__vanilla_cards__', entity: 'Card', idAttr: 'ID', fields: [] } },
  { id: 'vanilla-passives', title: '原版被动', icon: 'Shield', description: '', builtin: true, readonly: true, entity: { root: '__vanilla_passives__', entity: 'Ability', idAttr: 'ID', fields: [] } },
  { id: 'vanilla-abilities', title: '原版书页能力', icon: 'BadgeCheck', description: '', builtin: true, readonly: true, entity: { root: '__vanilla_abilities__', entity: 'Ability', idAttr: 'ID', fields: [] } }
]
