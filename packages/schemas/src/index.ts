import type { ModuleDefinition } from '@ruina/editor-core'
import { cardInfoModule } from './cardinfo'
import { passiveModule } from './passive'
import { enemyModule } from './enemy'
import { cardAbilityModule } from './cardability'
import { cardNameModule } from './cardname'
import { pageArtworkModule, buffIconsModule, otherImagesModule } from './artwork'

/**
 * 模块注册表：新增一种 XML 只需在这里追加一个 ModuleDefinition，
 * 数据区 / 本地化区 / 编辑区 / 预览区 / 专属正则均由通用引擎自动生成。
 */
export const modules: ModuleDefinition[] = [cardInfoModule, passiveModule, cardNameModule, cardAbilityModule, enemyModule, pageArtworkModule, buffIconsModule, otherImagesModule]

export type { ModuleDefinition } from '@ruina/editor-core'
export * from './meta'
export { cardInfoModule, passiveModule, cardNameModule, cardAbilityModule, enemyModule, pageArtworkModule, buffIconsModule, otherImagesModule }
