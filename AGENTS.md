# Working in this repository

Before shaping any new concept, read `DESIGN.md` — the design axioms bind.
Run `pnpm ready` before considering a change done. Fix every failure; never
weaken, bypass, suppress, or exempt tooling to make a change pass.

## Everything is Effect

All runtime code is Effect-based. Time, randomness, configuration, and logging
come from Effect services. Failures travel the error channel as tagged errors;
defects use `Effect.die`. Services are classes provided through Layers, never
ambient singletons. Data crossing IPC, disk, subprocess, or network boundaries
is decoded with Schema.

External SDK bridges belong in thin adapters. Keep policy and business logic
outside them.

## Structure

Prefer small, flat, single-purpose units that can be read and replaced in full.
Split by responsibility into purpose-named files and folders; never compress,
golf, or arbitrarily shard code to satisfy a guard. An extraction is named for
what the block means, not what it mechanically does. If no honest name exists,
the split is in the wrong place.

Comments explain constraints the code cannot express; they never narrate the
implementation.

## Packages and layers

A package is one responsibility, named for it. Dependencies point one way: the
session vocabulary is a leaf, port packages define interfaces, the domain holds
use cases, and adapters implement ports. Adapters know ports, never the domain;
the domain knows ports, never providers. Only the desktop app composes the two.

The renderer knows only the contract and session vocabulary. Electron belongs
in the desktop shell, and only persistence touches the database. When an import
wants to cross a layer, the package shape is wrong, not the rule. See
`quality-gates/package-architecture.md`.

## Tests

- A bug fix first reproduces the bug: the new test fails on the pre-fix code,
  then goes green with the fix.
- Test at the narrowest boundary that proves the behavior; mock only what is
  expensive, nondeterministic, or unavailable.
- Never assert mock plumbing, CSS classes, or callback wiring.
- Keep test volume proportionate to the behavioral change.

## Review

Start with `quality-gates/README.md` and apply the checklists it routes for the
change under review. They cover what mechanical guards cannot judge.

## Pull requests

Use an impact-focused title. Body sections: `### Why?` (the problem, one to
three sentences), `### How?` (the approach, one or two sentences),
`### Decisions` (one bullet per meaningful tradeoff), and `### Callouts` (one
bullet per spot deserving reviewer attention). Omit Decisions or Callouts when
empty; never add file lists, test plans, or diff narration.
