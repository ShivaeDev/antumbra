# Quality gate routing

Run `pnpm ready` for mechanical checks. During review, apply only the routes
touched by the change:

- Types, schemas, errors, or boundary decoding:
  [`strict-typing.md`](strict-typing.md)
- File splits, extractions, density, or responsibility:
  [`file-complexity.md`](file-complexity.md)
- New abstractions, options, parameters, flags, or exports:
  [`no-speculative-complexity.md`](no-speculative-complexity.md)
- Package responsibilities, imports, dependency edges, or composition:
  [`package-architecture.md`](package-architecture.md)
- Effect services, Layers, transaction ownership, or foreign callbacks:
  [`effect-services.md`](effect-services.md)
- Production behavior or tests: [`test-quality.md`](test-quality.md)
- Intents, durable state, processes, sessions, startup or shutdown,
  background observers, delivery, or resource reclamation:
  [`durable-recovery.md`](durable-recovery.md)
