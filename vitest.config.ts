import { defineConfig } from 'vitest/config'

// Note: no @vitejs/plugin-react here — unit tests are pure TS logic,
// not JSX rendering. JSX compilation only needed in vite.config.ts.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
