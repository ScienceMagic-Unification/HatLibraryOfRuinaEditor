import type { JSX as ReactJSX } from 'react'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = ReactJSX.Element
  }
}

export {}