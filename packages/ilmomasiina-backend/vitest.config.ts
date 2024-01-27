import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import config from './src/config';

if (!config.allowTestsToResetDb) {
  throw new Error(
    'THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED=1 must be set to run tests.\n'
    + 'Warning: Your database is cleared whenever you run tests.',
  );
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ['test/setup.ts'],
    // Running in parallel causes conflicts between global test resources.
    fileParallelism: false,
  },
});
