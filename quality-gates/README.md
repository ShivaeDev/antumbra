# Quality gate routing

Run `pnpm ready` for mechanical checks. During review, apply the universal
gates and each topic gate touched by the change.

## Universal

- [`strict-typing.md`](strict-typing.md)
- [`file-complexity.md`](file-complexity.md)
- [`no-speculative-complexity.md`](no-speculative-complexity.md)

## Routed by change

- Package responsibilities, imports, or composition:
  [`package-architecture.md`](package-architecture.md)
- Production behavior or tests: [`test-quality.md`](test-quality.md)
- Intents, durable state, processes, sessions, startup or shutdown,
  background observers, delivery, or resource reclamation:
  [`durable-recovery.md`](durable-recovery.md)
