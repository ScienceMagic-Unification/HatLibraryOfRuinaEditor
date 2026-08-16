import type { ModuleDefinition } from '@ruina/editor-core'

function resourceModule(
  id: string,
  title: string,
  dir: string,
  description: string,
  bindModuleId?: string,
  bindField?: string
): ModuleDefinition {
  return {
    id,
    title,
    icon: 'Image',
    description,
    entity: {
      root: '__resource__',
      entity: 'Asset',
      idAttr: 'Name',
      idOnlyList: true,
      fields: []
    },
    resource: {
      dir,
      type: 'image',
      ...(bindModuleId && bindField ? { bindModuleId, bindField } : {})
    }
  }
}

/** 书页图片工作区：Resource/CombatPageArtwork，也是后续图片工作区的模板 */
export const pageArtworkModule = resourceModule(
  'page-artwork',
  '书页图片',
  'Resource/CombatPageArtwork',
  '战斗书页卡图资源',
  'cardinfo',
  'Artwork'
)

/** buff 图标工作区：后续复用 ImageWorkspace，只改 resourceDir 与标题 */
export const buffIconsModule: ModuleDefinition = {
  ...resourceModule(
    'buff-icons',
    'Buff图标',
    'Resource/BuffIcon',
    '状态图标资源'
  ),
  resource: {
    dir: 'Resource/BuffIcon',
    type: 'image',
    recursive: true,
    defaultEmpty: true,
    square: true
  }
}

/** 其他图片工作区：后续复用 ImageWorkspace */
export const otherImagesModule = resourceModule(
  'other-images',
  '其他图片',
  'Resource',
  '其他图片资源'
)