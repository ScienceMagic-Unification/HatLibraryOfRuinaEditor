/** 游戏内通用显示元数据：供列表、表单与预览区复用，保证全应用风格统一 */

export const rarityMeta: Record<string, { label: string; color: string }> = {
  Common: { label: '平装', color: '#A8F29F' },
  Uncommon: { label: '精装', color: '#9AC6FA' },
  Rare: { label: '限定', color: '#BA97FF' },
  Unique: { label: '艺术', color: '#FFC075' }
}

export const rangeMeta: Record<string, string> = {
  Near: '近战',
  Far: '远程',
  Special: '特殊',
  Instance: '装备',
  FarArea: '群体攻击-清算',
  FarAreaEach: '群体攻击-交锋'
}

export const optionMeta: Record<string, string> = {
  Basic: '基础书页',
  OnlyPage: '专用书页',
  EGO: 'E.G.O',
  EgoPersonal: '个人E.G.O',
  Personal: '个人区域',
  NoInventory: '无法获取',
  ExhaustOnUse: '佚亡',
  EgoChange: 'E.G.O变身'
}

export const diceTypeMeta: Record<string, { label: string; color: string }> = {
  Atk: { label: '攻击', color: '#FF430A' },
  Def: { label: '防御', color: '#03BBFF' },
  Standby: { label: '待机', color: '#d3b14b' },
  StandBy: { label: '待机', color: '#d3b14b' }
}

export const detailMeta: Record<string, string> = {
  Hit: '命中',
  Guard: '格挡',
  Evasion: '闪避',
  Penetrate: '贯穿',
  Slash: '斩击'
}