import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/logic.js', 'src/data.js'],
      thresholds: {
        functions: 70,
        lines: 70,
        statements: 70,
        branches: 70,
      },
    },
  },
});
