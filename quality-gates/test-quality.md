# Test Quality

Tests prove behavior at the narrowest meaningful boundary and fail for meaningful regressions — not for internal refactors.

## Rules

1. A bug fix carries a test that failed before the fix. A test written after the fix that has never been red proves nothing.
2. Test the narrowest boundary that exhibits the behavior; prefer the lowest-cost fixture stack that still proves it. A meaningful regression should
   fail while a pure refactor passes unchanged.
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
8. Repeated test behavior belongs to its semantic owner or a narrow shared test support package. Use Effect primitives directly when a helper would
   only rename them, and never hide clocks, barriers, and black-box polling behind one universal waiting helper.
