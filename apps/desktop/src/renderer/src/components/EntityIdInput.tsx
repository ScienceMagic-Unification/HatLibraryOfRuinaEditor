import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Input } from '@ruina/ui'

/** Entity identity is committed only after editing, never on a partial keystroke. */
export function EntityIdInput({ value, onCommit, numeric, ...props }: Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: string
  numeric?: boolean
  onCommit: (value: string) => boolean | void
}): JSX.Element {
  const [draft, setDraft] = useState(value)
  const pending = useRef(value)
  const committed = useRef(value)
  useEffect(() => { setDraft(value); pending.current = value; committed.current = value }, [value])
  const commit = () => {
    const next = pending.current.trim()
    if (!next || next === committed.current || onCommit(next) === false) {
      pending.current = committed.current
      setDraft(committed.current)
    } else {
      committed.current = next
      pending.current = next
      setDraft(next)
    }
  }
  return <Input data-testid="entity-id-input" {...props} value={draft} inputMode={numeric ? 'numeric' : undefined}
    onChange={(e) => { const next = numeric ? e.target.value.replace(/\D/g, '') : e.target.value; pending.current = next; setDraft(next) }}
    onBlur={commit}
    onKeyDown={(e) => {
      if (e.nativeEvent.isComposing) return
      if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur() }
      if (e.key === 'Escape') { e.preventDefault(); pending.current = value; setDraft(value); e.currentTarget.blur() }
    }} />
}
