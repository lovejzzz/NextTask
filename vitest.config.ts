import { defineConfig } from 'vitest/config';

import { appVersion } from './config/appVersion';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    // Default to a fast node env for pure logic + schema tests. Component and
    // hook tests opt into jsdom per file via `// @vitest-environment jsdom`.
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'api/**/*.test.ts',
      'scripts/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    setupFiles: ['src/test/setup.ts'],
    globals: false,
  },
});
