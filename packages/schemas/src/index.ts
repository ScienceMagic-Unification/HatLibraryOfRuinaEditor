import type { ModuleDefinition } from '@ruina/editor-core'
import { cardInfoModule } from './cardinfo'
import { passiveModule } from './passive'
import { passiveAbilityModule } from './passiveability'
import { effectTextModule } from './effecttext'
import { enemyModule } from './enemy'
import { cardAbilityModule } from './cardability'
import { cardNameModule } from './cardname'
import { pageArtworkModule, buffIconsModule, otherImagesModule } from './artwork'
import { builtinImagesModule, vanillaRegexModule, singularityRegexModule, modRegexModule, singularityModules } from './singularity'

/**
 * 模块注册表：新增一种 XML 只需在这里追加一个 ModuleDefinition，
 * 数据区 / 本地化区 / 编辑区 / 预览区 / 专属正则均由通用引擎自动生成。
 */
export const modules: ModuleDefinition[] = [cardInfoModule, passiveModule, passiveAbilityModule, effectTextModule, cardNameModule, cardAbilityModule, enemyModule, pageArtworkModule, buffIconsModule, otherImagesModule, builtinImagesModule, vanillaRegexModule, singularityRegexModule, modRegexModule]

export type { ModuleDefinition } from '@ruina/editor-core'
export * from './meta'
export { cardInfoModule, passiveModule, passiveAbilityModule, effectTextModule, cardNameModule, cardAbilityModule, enemyModule, pageArtworkModule, buffIconsModule, otherImagesModule, builtinImagesModule, vanillaRegexModule, singularityRegexModule, modRegexModule, singularityModules }