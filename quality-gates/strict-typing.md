# Strict Typing

The compiler runs at maximum strictness and the linter bans the escape
hatches. This gate judges the type design itself.

## Rules

1. No `any`, no `as` casts except `as const`, and no unregistered pragmas.
   Prefer `satisfies`; prefer decoding with Schema over asserting.
2. Model states as tagged unions, not boolean flags or loose strings. Illegal
   states should be unrepresentable.
3. Errors are tagged error classes on the Effect error channel — never thrown,
   never stringly-typed. Tags must be precise enough for callers to branch on.
4. Public signatures name domain types, not primitives: an id is a branded
   type, not `string`.
5. Data entering from outside (IPC, disk, subprocess, network) is decoded
   exactly once with Schema at the boundary — internal code never re-validates.
