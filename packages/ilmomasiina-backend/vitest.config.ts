import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ['test/setup.ts'],
    // Running in parallel causes conflicts between global test resources.
    fileParallelism: false,
  },
});
