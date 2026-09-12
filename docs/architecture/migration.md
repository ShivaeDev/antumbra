# Architecture cutover

The migration replaces the in-process Domain, Kernel, Prisma, tRPC, and plugin composition with the server, runner, and glass architecture described
in [Architecture](../../ARCHITECTURE.md). The [North Star](north-star.md) records the design rationale. This document records the cutover boundaries;
it is not a feature roadmap or a test verdict.

## Resulting ownership

| Responsibility                                                                     | Owner after cutover                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Native windows, shell state, process supervision, quit and requested restart       | `apps/desktop`                                          |
| Facts, commands, materialized rows, live queries, replay                           | `packages/server/journal` and `packages/server/domains` |
| Runtime reconciliation, external custody, tool handlers, and RPC assembly          | `apps/server`                                           |
| Provider sessions, durable execution log, tool binding, Git and machine operations | `apps/runner` and `packages/runner`                     |
| Shared contracts and declaration primitives                                        | `packages/platform`                                     |
| Feature screens, forms, renderer, and browser harness                              | `packages/glass`                                        |
| Production application tests with external doubles                                 | `apps/testing` and feature-owned test suites            |

The feature migration includes settings, Voyages, Pieces, Agents, starts, Sessions, lifecycle, Boards, mail, Rulings, repositories, Changes,
Artifacts, Reports, inputs, costs, provider capacity, and resource reclamation. Cross-feature readings are registered projection stages. There is no
replacement facade for the old Domain package: each invariant has a feature owner, and runtime effects have an app owner.

The runner retains execution ownership while the server reconnects. Log cursors and operation request ids are distinct: the cursor records consumed
evidence, while the request id identifies an authorized effect. Frozen tool descriptors travel with Session starts. They do not imply that this
migration implements staged binary replacement or historical tool-handler hosting.

## Data compatibility

The Prisma database `antumbra.db` is not imported into the journal and is not deleted. An installation containing unsupported legacy data is refused
by the shell before the new runtime launches, with an explanation of the unsupported upgrade. This cutover does not authorize resetting an occupied
data directory or silently discarding its old records.

An existing `server/journal.db` remains the journal. Its facts are retained and replayed when materialized table shape changes, using supported fact
migrations. Before rebuilding existing projections, the journal makes a backup under `server/backups/`; fresh and unchanged journals do not trigger
that backup. There is no fixed backup retention or pruning guarantee. The runner log and app-managed content have their own durable owners; rebuilding
server projections is not permission to erase either.

## Completion boundary

The implementation cutover is delivered together so that desktop entrypoints, server runtime, runner packaging, glass, and deletion of the old
packages can be reviewed as one coherent application. Source migration does not establish that all verification has passed. Completion requires the
integrated repository gates, application and runner tests, process startup, and packaging checks to pass on the final tree.

Removal includes obsolete manifests, build assets, test discovery, compatibility bridges, and migration-only import allowances. Tests of replaced
Kernel, Prisma, or tRPC machinery can leave with that machinery; tests of product behavior must remain at the new owner. A renamed test or an empty
old directory is not evidence of preserved behavior.

The cutover does not amend [DESIGN.md](../../DESIGN.md) or erase [intended work](../design/intended.md). Product commitments that were not implemented
before the migration remain explicit intended work, rather than becoming invented migration features.
