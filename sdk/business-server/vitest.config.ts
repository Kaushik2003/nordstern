import { defineConfig } from 'vitest/config';

// Money-flow tests (R6 M3). Each suite spins a real Postgres via Testcontainers and
// exercises the real release/payout logic with only the external chain/PSP stubbed.
// Files run sequentially (one container at a time); generous timeouts for container start.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
    pool: 'forks',
    watch: false,
  },
});
