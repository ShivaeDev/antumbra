# Working in this repository

Before shaping any new concept, read `DESIGN.md` — the design axioms bind.
Run `pnpm ready` before considering a change done. Fix every failure; never
weaken, bypass, suppress, or exempt tooling to make a change pass.

Runtime code is Effect-based: dependencies come from services and Layers,
failures use the error channel, and boundary data is decoded with Schema.
Package dependencies point one way; fix the package shape, never the boundary.
Comments state constraints the code cannot express; they never narrate.

For judgment beyond the mechanical gates, follow only the applicable routes in
`quality-gates/README.md`. When publishing, follow
`docs/contributing/pull-requests.md`.
