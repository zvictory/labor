import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// jsdom gives the UTM util a real `localStorage` to exercise its persistence
// branches. Pure logic only for now — no React component tests yet, so no
// @vitejs/plugin-react. Path alias mirrors tsconfig (`@/*` -> `src/*`).
export default defineConfig({
  test: {
    environment: 'jsdom',
    // jsdom's localStorage stub is inert in this env; setupFiles installs a real
    // in-memory Storage so the UTM persistence branches are exercisable.
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
