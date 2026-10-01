import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Vitest is not a React client build; map Next's deliberate runtime guard to a test-only shim. */
export default defineConfig({
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url)),
    },
  },
});
