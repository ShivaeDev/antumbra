# Working in this repository

Before shaping any new concept, read `DESIGN.md` — the design axioms bind. Before writing or reviewing code, apply `quality-gates/simplicity.md` —
reject complexity that does not pay for itself with a current need. Run `pnpm ready` before considering a change done. Fix every failure; never
weaken, bypass, suppress, or exempt tooling to make a change pass.

Runtime code is Effect-based: dependencies come from services and Layers, failures use the error channel, and boundary data is decoded with Schema.
Package dependencies point one way; fix the package shape, never the boundary. Comments are exceptional and never narrate; `why:` is not repository
style.

For judgment beyond the mechanical gates, follow only the applicable routes in `quality-gates/README.md`. When publishing, follow
`docs/contributing/pull-requests.md`.

- `pnpm wt new <lane>/<task>` opens the worktree a change is built in; the name must have exactly that shape.
- `pnpm pr watch <pull request url or number>` prints one JSON line when the pull request needs someone (merged, closed, conflict, changes requested,
  a failed check once every check has settled, a review or comment) and nothing otherwise; `--until ci` exits with the checks' verdict instead.
