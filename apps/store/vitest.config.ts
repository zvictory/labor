import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Next resolves the tsconfig `@/*` alias on its own; Vitest has to be told, or a
// test that reaches code importing `@/lib/…` at runtime fails to load.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
});
