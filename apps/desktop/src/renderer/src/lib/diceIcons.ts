const modules = import.meta.glob('../assets/dice/*.png', { eager: true, import: 'default' }) as Record<string, string>

/** 按 `Dice_{Detail}{Type}.png` 查找骰子图标，找不到返回 undefined */
export function diceIconUrl(detail: string, type: string): string | undefined {
  if (!detail || !type) return undefined
  return modules[`../assets/dice/Dice_${detail}${type}.png`]
}