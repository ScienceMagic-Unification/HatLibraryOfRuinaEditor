import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', '../../apps/desktop/test/**/*.test.mjs'],
    environment: 'node'
  }
})
