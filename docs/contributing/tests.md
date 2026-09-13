# Running tests

Use `pnpm test:packages` for package suites, `pnpm test:desktop` for shell tests, `pnpm test:runner` for runner app tests, `pnpm test:server` for
server app tests, `pnpm test:app` for shared application tests, and `pnpm test:guards` for repository tooling tests. `pnpm test` runs the package,
desktop, runner, server, and application suites in sequence.

To run a smaller suite, use a package's test script, for example `pnpm --filter @antumbra/domain-reclamation test test/reclamation.test.ts`. Arguments
pass through to Vitest.

These scripts share a local test lock across the repository's worktrees. A test command waits before starting Vitest when another command holds the
lock. Waiting does not count against test timeouts. Normal completion, failure, and cancellation release the lock after the test process exits.

CI does not take the local lock, so its shards can run in parallel. `pnpm ready` also stays independent. Raw `pnpm exec vitest` bypasses the wrapper,
and with it the lock, the timeout budget and CI's retry; use the test scripts.

The lock lives in the system temporary directory, keyed by the shared Git directory. `proper-lockfile` maintains its lease and reclaims stale locks
after an unclean exit. Force-killing the wrapper cannot guarantee cleanup of its surviving child processes; stop those processes before starting
another test run.

## Waiting for an answer

A test never waits without a bound. `answered`, `eventually` and `until` give up after five seconds and say what they were waiting for, so a wrong
predicate fails by name instead of as Vitest's opaque timeout. Each takes a description of the thing awaited — `the birth to be admitted`,
`the control labelled "Name" to render` — and the failure quotes that description with the last value the query answered.

## The budget, the retry, and flaky tests

A test may take twenty seconds. With every wait bounded at five seconds, that budget is reached only by a genuinely slow case. Never widen one test's
timeout, and never give one test a retry.

CI runs a failing test up to three times; a local run never retries, so a flake shows itself. A test that fails every time fails the job as it always
has. A test that fails at least once and passes at least once does not fail the job: `pnpm flakes` collects it from the run's reports and opens an
issue labelled `flaky test` naming the test, its file, its runs and its failures, or comments on the open issue that already names it.

A `flaky test` issue is a defect to fix. It is never a reason to widen a timeout or to add a retry to the test.
