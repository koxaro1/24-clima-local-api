import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules/**', '.claude/**', '.opencode/**', '.next/**'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['**/__tests__/**', '**/firebase.ts', '**/env.ts'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
