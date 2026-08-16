import { useEffect, useRef } from 'react'

/** 自动增高描述框：保留最小行数，内容变多时向下扩展。 */
export function AutoTextarea({
  value,
  onChange,
  rows = 4,
  className = '',
  placeholder,
  disabled = false,
  readOnly = false
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  className?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
}): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly || disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
    />
  )
}