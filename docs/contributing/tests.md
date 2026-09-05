# Running tests

Use `pnpm test:packages` for package suites, `pnpm test:desktop` for desktop tests, `pnpm test:runner-local` for runner tests, and `pnpm test:guards`
for repository tooling tests. `pnpm test` runs the package, desktop, and runner suites in sequence.

To run a smaller suite, use a package's test script, for example `pnpm --filter @antumbra/kernel test test/active-intents.test.ts`. Arguments pass
through to Vitest.

These scripts share a local test lock across the repository's worktrees. A test command waits before starting Vitest when another command holds the
lock. Waiting does not count against test timeouts. Normal completion, failure, and cancellation release the lock after the test process exits.

CI does not take the local lock, so its shards can run in parallel. `pnpm ready` also stays independent. Raw `pnpm exec vitest` bypasses the wrapper;
use the test scripts when working alongside other local test runs.

The lock lives in the system temporary directory, keyed by the shared Git directory. `proper-lockfile` maintains its lease and reclaims stale locks
after an unclean exit. Force-killing the wrapper cannot guarantee cleanup of its surviving child processes; stop those processes before starting
another test run.
