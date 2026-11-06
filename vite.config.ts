import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' so the production build also works when opened from any folder or static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
  test: { include: ['src/**/*.test.ts'] },
});
