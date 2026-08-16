# Effect service parameter debt

Production functions should require services through their Effect environment,
not accept service values or bundles as ordinary parameters. The guard builds a
TypeScript program and follows symbol identity, generic constraints, inferred
parameters, factory returns, interfaces, aliases, and destructuring so a new
spelling or wrapper around an old dependency does not evade the rule.

It recognizes Effect `Context.Service` and `Context.Tag` classes, database
service/executor types, non-empty `Context.Context` values, and structural
`write` capabilities backed by `WriteExecutors`. An `Effect` or `Stream` whose
environment mentions a service is a computation, not a manually passed service
value, and is not debt by itself.

`service-parameter-allowance.json` freezes the exact debt that existed when the
guard landed and never changes. `service-parameter-baseline.json` starts as the
same set and may only be a subset of that allowance. An unlisted parameter
fails, an active entry whose parameter disappeared fails, and an active entry
outside the frozen allowance fails. When a service parameter is removed, delete
its active baseline entry in the same change; never add, rewrite, or restore an
entry. Because entries include the full source path and both registries reject
paths outside the sole legacy root, `packages/domain/src`, a new package has no
allowance.

Tests and the desktop composition root `apps/desktop/src/main.ts` are the path
exemptions. Adapters remain checked. The two contract router runtime parameters
are exact foreign-callback composition seams: they close the desktop-owned
runtime into tRPC callbacks. Their file, callable, parameter, and type must all
match; neighboring helpers remain checked.
