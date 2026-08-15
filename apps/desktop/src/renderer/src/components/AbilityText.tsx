import { Fragment } from 'react'

/** 能力描述渲染：默认把 [任意文本] 替换为黄色的该文本 + 一个小空格 */
export function AbilityText({ text }: { text: string }): JSX.Element {
  const parts = text.split(/(\[[^\]]+\])/g)
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([^\]]+)\]$/)
        if (m) {
          return (
            <span key={i} className="text-yellow-400">
              {m[1] + '\u2009'}
            </span>
          )
        }
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}