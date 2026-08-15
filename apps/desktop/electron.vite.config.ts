import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const root = resolve(__dirname, '../..')
const alias = {
  '@ruina/editor-core': resolve(root, 'packages/editor-core/src/index.ts'),
  '@ruina/schemas': resolve(root, 'packages/schemas/src/index.ts'),
  '@ruina/ui': resolve(root, 'packages/ui/src/index.ts')
}

export default defineConfig({
  main: {
    resolve: { alias }
  },
  preload: {
    resolve: { alias }
  },
  renderer: {
    resolve: { alias },
    plugins: [react()]
  }
})
