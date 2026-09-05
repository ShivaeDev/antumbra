# Test Quality

Tests prove behavior at the narrowest meaningful boundary and fail for meaningful regressions — not for internal refactors.

## Rules

1. A bug fix carries a test that failed before the fix. A test written after the fix that has never been red proves nothing.
2. Test the narrowest boundary that exhibits the behavior; prefer the lowest-cost fixture stack that still proves it. A meaningful regression should
   fail while a pure refactor passes unchanged. Do not mirror the implementation or pin prompt and tool-description prose with literal assertions. For
   generated context, prove which inputs include or omit a section; require exact text only when the text itself is a protocol contract.
3. Mock only necessary boundaries: expensive, nondeterministic, or unavailable in the test environment.
4. Never assert mock call counts, wiring, or passthrough props as the only proof — that tests the test, not the behavior.
5. Test diff size stays proportionate to the behavioral change. A one-line behavior change does not justify fifty lines of new assertions.
6. Delete tests whose behavior no longer exists. Dead tests are debt, not coverage.
7. Observe asynchronous behavior through the cause the test controls:
   - Use `TestClock` for application time. When advancing the whole test clock would also drive unrelated fibers, provide a focused `Clock` to the act
     whose reading of time matters.
   - Use `Deferred`, `Queue`, a stream element, or another explicit barrier for a controlled fake or signal. A real sleep or repeated state read is
     not a substitute for a signal the test owns.
   - Use condition-named, bounded polling only across a true black-box boundary that exposes no causal signal.
8. Use the established fixture at the boundary being tested: `persistenceIt().effectDB` for isolated persistence-backed acts, and the appropriate
   `effectApp` harness for composed capability or runtime behavior. These helpers own the test scope, database cleanup, and test clock; do not repeat
   that lifecycle in each test. Keep explicit separate database or runtime lifetimes when reconstruction or durable recovery is the behavior under
   test. Request live time only when the boundary requires it.
9. Repeated test behavior belongs to its semantic owner or a narrow shared test support package. Use Effect primitives directly when a helper would
   only rename them, and never hide clocks, barriers, and black-box polling behind one universal waiting helper.
