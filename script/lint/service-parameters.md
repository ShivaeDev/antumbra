# Effect service parameter debt

Production functions should require services through their Effect environment,
not accept service values or bundles as ordinary parameters. The TypeScript-AST
guard follows service-bearing interfaces and type aliases transitively so a new
name around an old dependency does not evade the rule.

The analysis is syntactic TypeScript AST analysis. It recognizes Effect
`Context.Service` and `Context.Tag` classes, database service/executor types,
non-empty `Context.Context` values, imported aliases, and structural `write`
bundles backed by `WriteExecutors`. An `Effect` or `Stream` whose environment
mentions a service is a computation, not a manually passed service value, and
is not debt by itself.

`service-parameter-allowance.json` freezes the exact debt that existed when the
guard landed and never changes. `service-parameter-baseline.json` starts as the
same set and may only be a subset of that allowance. An unlisted parameter
fails, an active entry whose parameter disappeared fails, and an active entry
outside the frozen allowance fails. When a service parameter is removed, delete
its active baseline entry in the same change; never add, rewrite, or restore an
entry. Because entries include the full source path and both registries reject
paths outside the sole legacy root, `packages/domain/src`, a new package has no
allowance.

Tests, provider adapters under `src/adapters`, and the desktop composition root
`apps/desktop/src/main.ts` are the only exemptions. Those boundaries sometimes
receive concrete implementations by design; similarly named neighboring paths
remain checked.

The guard intentionally does not run a TypeScript type checker. A service hidden
behind an opaque computed type that never names a known service cannot be
followed until the rule learns that construction; add a focused AST case when a
new service-declaration idiom enters the repository.
