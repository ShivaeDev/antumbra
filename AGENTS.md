# Working in this repository

Before shaping any new concept, read `DESIGN.md` — the design axioms bind. Before writing or reviewing code, apply `quality-gates/simplicity.md` —
reject complexity that does not pay for itself with a current need. Run `pnpm ready` before considering a change done. Fix every failure; never
weaken, bypass, suppress, or exempt tooling to make a change pass.

Runtime code is Effect-based: dependencies come from services and Layers, failures use the error channel, and boundary data is decoded with Schema.
Production package dependencies point one way. Tests may dev-depend on `@antumbra/app-testing`, which loads the production app; production sources
never import it. Fix the package shape, never hide a dependency behind an alias. Comments are exceptional and never narrate; `why:` is not repository
style.

For judgment beyond the mechanical gates, follow only the applicable routes in `quality-gates/README.md`. When publishing, follow
`docs/contributing/pull-requests.md`.

- `pnpm wt new <lane>/<task>` opens the worktree a change is built in; the name must have exactly that shape.
- `pnpm pr watch <pull request | owner/repo>...` prints one JSON line, naming the pull request, when one needs someone (merged, closed, a conflict,
  its clearing, falling behind, changes requested, checks and commit statuses settling red or green on a head, a new review or comment) and nothing
  otherwise. `owner/repo` follows every open pull request of that repository, and a bare number means the repository of the current directory. A state
  file under `~/.antumbra/pr-watch/` (or `--state <file>`) keeps a restart from repeating a line, and a first run takes existing comments as read.
  `--until ci` exits with one pull request's check verdict instead.
