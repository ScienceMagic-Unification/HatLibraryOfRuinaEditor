import type { RuinaApi } from './index'

declare global {
  interface Window {
    api: RuinaApi
  }
}

export {}
