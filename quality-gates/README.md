# Quality gate routing

Run `pnpm ready` for fast local mechanical checks. Hosted CI owns the complete
package, desktop, runner, and guard test suites. During review, apply only the
routes touched by the change:

- Types, schemas, errors, or boundary decoding:
  [`strict-typing.md`](strict-typing.md)
- File splits, extractions, density, or responsibility:
  [`file-complexity.md`](file-complexity.md)
- New abstractions, options, parameters, flags, or exports:
  [`no-speculative-complexity.md`](no-speculative-complexity.md)
- Package responsibilities, imports, dependency edges, or composition:
  [`package-architecture.md`](package-architecture.md)
- Effect services, Layers, transaction ownership, persistence-backed domain
  reads, or foreign callbacks:
  [`effect-services.md`](effect-services.md)
- Production behavior or tests: [`test-quality.md`](test-quality.md)
- Intents, durable state, processes, sessions, startup or shutdown,
  background observers, delivery, or resource reclamation:
  [`durable-recovery.md`](durable-recovery.md)

## Improving the gates

Quality feedback starts with clarification, not pattern copying. Ask why the
shape is good or bad and identify the invariant, dependency, lifetime, or cost
behind the direction. Record the answer in the durable decision or Work record
that owns the change so the reasoning survives the review.

Then update the narrow applicable route when the lesson is reusable. Add a
mechanical gate only when a tool can prove the fact without guessing at
semantics; otherwise preserve it as explicit review guidance with representative
good and bad examples. A one-off preference need not become repository law.
