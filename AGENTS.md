# Working in this repository

The conventions here are enforced by tooling, not requested by prose. Run
`pnpm lint` before considering any change done; run `pnpm ready` for the full
validation stack (lint, build, typechecks, tests, guard tests). Before
shaping any new concept, read `DESIGN.md` — the design axioms bind.

## The guards

`node script/lint.ts`, run by `pnpm lint`: rules in `script/lint/rules/`,
impure edges in `script/lint/adapters/`. It walks `script/` too, so a banned
token is never spelled in TypeScript — rule patterns live in
`script/lint/rules/rule-patterns.json`, guard fixtures in
`script/test/fixtures/`.

## Everything is Effect

All runtime code is Effect-based. The pattern linter fails the build on
`async`/`await`, raw Promises, `try`/`catch`, `throw`, `Date.now()`,
`new Date()`, `Math.random()`, `console.*`, and `process.env`:

- Time comes from Effect's Clock, randomness from Random, configuration from
  Config, logging from the Effect logger.
- Failures travel the error channel as tagged errors; defects use
  `Effect.die`.
- Services are classes provided through Layers; no ambient singletons.
- Data crossing any boundary (IPC, disk, subprocess) is decoded with Schema.

The single exemption: modules under an `adapters/` folder, whose only job is
wrapping an external SDK into Effect. Keep adapters thin; logic lives outside
them.

## Comments

Comments are banned by the linter. When code genuinely cannot express a
constraint, write `// why: ...` (or a `/* why: ... */` block) — every
surviving comment is a deliberate, greppable claim. Lint suppression does
not exist: `biome-ignore` (in every form) is itself a lint failure. A false
positive means the lint rule is wrong — fix the rule, a reviewed guard
change, or fix the code; never silence the site. The only tool pragma is
the compiler's `@ts-expect-error`, which requires a reason and an entry in
`script/pragma-registry.json`; `@ts-ignore` and `@ts-nocheck` are never
allowed.

## Size, structure, and depth

Small, flat, single-purpose units are the goal; the guards only enforce the
floor. A file that covers one concern can be read, reviewed, and replaced in
full. A function that stays shallow states its logic; nesting and branching
hide it. When code grows past a guard, the answer is always decomposition by
responsibility — named functions in purpose-named files — never denser code.

- Source files: 150 lines. Test files: 300. There is no baseline of
  grandfathered exceptions and none will be added.
- A line indented eight tabs or deeper fails the lint: extract a named
  function (or component) instead of nesting further.
- Biome fails nested ternaries and any function over cognitive complexity
  15: prefer early returns and if-chains over ternary towers and wide
  branching.
- Split along responsibilities into purpose-named files and nested folders —
  a folder per concern — never golf a file under the cap, and never shard it
  arbitrarily.
- An extraction is named for what the block means, not what it mechanically
  does. If no honest name exists, the split is in the wrong place.
- `index.ts` exists only as a package entry. No barrels.
- Any imported file should be readable in full.

## Packages and layers

A package is one responsibility, named for it. Dependencies point one way:
the session vocabulary is a leaf, the port packages define the interfaces,
the domain holds the use cases, and adapters implement the ports — one
package per implementation, beside the interface it implements. Adapters
know ports, never the domain; the domain knows ports, never the providers
behind them. Only the desktop app composes the two. When an import wants to
cross a layer, the package shape is wrong, not the rule. See
`quality-gates/package-architecture.md`.

## Boundaries

`.dependency-cruiser.cjs` enforces package direction: the renderer imports
only the contract and session-events packages (never Electron, never core
packages); adapter packages (`backend-*`, `runner-*`) never import the
domain; the domain never imports an adapter or a provider SDK; Electron APIs
appear only in the desktop shell; the contract and session-events packages
import nothing; nothing imports the app shell; only the persistence package
touches the database. Never edit guard or boundary configuration to make a
violation pass — fix the code.

## Tests

- A bug fix first reproduces the bug: the new test fails on the pre-fix
  code, then goes green with the fix.
- Test at the narrowest boundary that proves the behavior; mock only what is
  expensive, nondeterministic, or unavailable.
- Never assert mock plumbing, CSS classes, or callback wiring.
- Test diff size stays proportionate to the behavioral change.

## Review

Apply every checklist in `quality-gates/` when reviewing a change. They cover
what the mechanical guards cannot judge.

## Pull requests

Impact-focused title. Body sections: `### Why?` (the problem, one to three
sentences), `### How?` (the approach, one or two sentences), `### Decisions`
(one bullet per meaningful tradeoff), `### Callouts` (one bullet per spot
deserving reviewer attention). Omit Decisions/Callouts when empty; never add
file lists, test plans, or diff narration.
