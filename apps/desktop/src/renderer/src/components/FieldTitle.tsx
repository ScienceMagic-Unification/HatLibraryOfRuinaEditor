import { Label } from '@ruina/ui'
import { Hash } from 'lucide-react'

/** 字段标题：右侧提供可点击的 ID 切换按钮，激活颜色跟随稀有度主题色 */
export function FieldTitle({
  label,
  required,
  showIds,
  onToggle,
  accentColor
}: {
  label: string
  required?: boolean
  showIds: boolean
  onToggle: () => void
  accentColor?: string
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label>
        {label}
        {required ? <span className="ml-0.5 text-red-400">*</span> : null}
      </Label>
      <button
        type="button"
        onClick={onToggle}
        title={showIds ? '当前显示真实 ID，点击切换为名称' : '点击显示真实 ID'}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-all hover:opacity-80 active:scale-95"
        style={
          showIds && accentColor
            ? { color: accentColor, borderColor: accentColor, backgroundColor: accentColor + '1A' }
            : { color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--secondary))' }
        }
      >
        <Hash className="size-3" /> ID
      </button>
    </div>
  )
}