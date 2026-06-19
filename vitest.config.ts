import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default to a fast node env for pure logic + schema tests. Component and
    // hook tests opt into jsdom per file via `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'api/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    globals: false,
  },
});
