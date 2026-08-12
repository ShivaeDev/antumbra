# Test Quality

Tests prove behavior at the narrowest meaningful boundary and fail for
meaningful regressions — not for internal refactors.

## Rules

1. A bug fix carries a test that failed before the fix. A test written after
   the fix that has never been red proves nothing.
2. Test the narrowest boundary that exhibits the behavior; prefer the
   lowest-cost fixture stack that still proves it.
3. Mock only necessary boundaries: expensive, nondeterministic, or
   unavailable in the test environment.
4. Never assert mock call counts, wiring, or passthrough props as the only
   proof — that tests the test, not the behavior.
5. Test diff size stays proportionate to the behavioral change. A one-line
   behavior change does not justify fifty lines of new assertions.
6. Delete tests whose behavior no longer exists. Dead tests are debt, not
   coverage.

## Review checklist

- [ ] For each bug fix: was the new test demonstrably red pre-fix?
- [ ] Would a meaningful regression fail this suite while a pure refactor
      passes untouched?
- [ ] Is every mock justified under rule 3?
- [ ] Is any assertion only about plumbing (mocks, wiring, structure)?
- [ ] Is the test volume proportionate to the change?
