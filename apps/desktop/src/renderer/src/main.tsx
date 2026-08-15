import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'
import { useAppStore } from './store'
import { I18nProvider } from './i18n'
import { cardAccent } from './lib/cardAccent'
import { listEntities } from '@ruina/editor-core'

;(window as any).__store = useAppStore
;(window as any).__debug = { cardAccent, listEntities }

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
    <App />
  </I18nProvider>
  </React.StrictMode>
)
