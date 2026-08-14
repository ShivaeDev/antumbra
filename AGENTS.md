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
surviving comment is a deliberate, greppable claim. Tool pragmas
(`@ts-expect-error`, `biome-ignore`) require a reason and an entry in
`script/pragma-registry.json`; `@ts-ignore` is never allowed.

## Size and structure

- Source files: 150 lines. Test files: 300. There is no baseline of
  grandfathered exceptions and none will be added.
- Split along responsibilities into purpose-named files and nested folders —
  never golf a file under the cap, and never shard it arbitrarily.
- `index.ts` exists only as a package entry. No barrels.
- Any imported file should be readable in full.

## Boundaries

`.dependency-cruiser.cjs` enforces package direction: the renderer imports
only the contract package (never Electron, never core packages); Electron
APIs appear only in the desktop shell; the contract package imports nothing;
nothing imports the app shell; only the persistence package touches the
database. Never edit guard or boundary configuration to make a violation
pass — fix the code.

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
