# Effect service parameters

Production functions require services through their Effect environment, not as ordinary parameters carrying service values or bundles. The guard
builds a TypeScript program and follows symbol identity, generic constraints, inferred parameters, factory returns, interfaces, aliases, and
destructuring so a new spelling or wrapper around an old dependency does not evade the rule.

It recognizes Effect `Context.Service` and `Context.Tag` classes, the database service type, and non-empty `Context.Context` values. An `Effect` or
`Stream` whose environment mentions a service is a computation, not a manually passed service value, and is not debt by itself.

Every service-bearing parameter in a checked file fails `pnpm lint`. There is no baseline or allowance: remove the parameter and require the service
from Effect instead.

Tests and the desktop composition root `apps/desktop/src/main.ts` are the path exemptions. Adapters remain checked. The two contract router runtime
parameters are exact foreign-callback composition seams: they close the desktop-owned runtime into tRPC callbacks. Their file, callable, parameter,
and type must all match; neighboring helpers remain checked.
