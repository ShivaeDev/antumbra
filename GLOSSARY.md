# Glossary

Antumbra uses a small product vocabulary so a chart, a conversation, and the
app can mean the same thing. This is an index, not an encyclopedia: each term
links to the one design guide that explains its relationships and behavior.
Code and schemas remain the authority for exact fields and states.

## Work and planning

Owner: [Work and planning](docs/design/work-and-planning.md)

- [**Admiral**](docs/design/work-and-planning.md#authority-and-staffing) — the human who directs the fleet without conning a ship.
- [**Captain**](docs/design/work-and-planning.md#authority-and-staffing) — the Agent role accountable for one Voyage.
- [**Crew**](docs/design/work-and-planning.md#authority-and-staffing) — Agents assigned to a Voyage's Pieces.
- [**Polaris**](docs/design/work-and-planning.md#voyages-and-their-course) — the fixed north star a Voyage moves toward but never reaches.
- [**Voyage**](docs/design/work-and-planning.md#voyages-and-their-course) — a ship under sail for an objective, with its charted work and memory.
- [**Ephemeris**](docs/design/work-and-planning.md#ephemerides-and-the-cone-of-uncertainty) — a revisable forecast of the course, not a promise.
- [**Cone of uncertainty**](docs/design/work-and-planning.md#ephemerides-and-the-cone-of-uncertainty) — the horizon inside which waypoints can be chosen honestly.
- [**Leg**](docs/design/work-and-planning.md#legs) — one SIGHT, PLOT, SAIL, DRIFT planning loop.
- [**Piece**](docs/design/work-and-planning.md#pieces) — a bounded place for durable work and its outcomes.
- [**Occultation**](docs/design/work-and-planning.md#occultations-and-dependency-blockage) — a high-level obstacle in the plan, distinct from a Piece being dependency-blocked.
- [**Posture**](docs/design/work-and-planning.md#posture-readiness-and-progress) — the admiral's standing direction toward a governed subject, never execution status.

## Attention and memory

Owner: [Attention and memory](docs/design/attention-and-memory.md)

- [**Board**](docs/design/attention-and-memory.md#boards-and-registers) — an entity's durable place for memory and addressed signal.
- [**Rough log**](docs/design/attention-and-memory.md#boards-and-registers) — the Board register for high-volume working context.
- [**Smooth log**](docs/design/attention-and-memory.md#boards-and-registers) — the Board register for distilled successor context.
- [**Smoothing**](docs/design/attention-and-memory.md#smoothing) — advancing a Board's useful frontier without erasing its sources.
- [**Attention lanes**](docs/design/attention-and-memory.md#attention-lanes) — escalation, decision point, finding, and grievance.
- [**Question**](docs/design/attention-and-memory.md#questions-and-rulings) — a durable fork recorded on the Board where it arose and routed for a ruling.
- [**Heave to**](docs/design/attention-and-memory.md#heave-to) — discussion mode that keeps the Agent's context from moving on.
- [**Precedence**](docs/design/attention-and-memory.md#mail-and-precedence) — routine, priority, and flash ordering for Agent mail.

## Changes and delivery

Owner: [Changes and delivery](docs/design/changes-and-delivery.md)

- [**Outcome**](docs/design/changes-and-delivery.md#outcomes) — a typed result a Piece expects and eventually lands.
- [**Report**](docs/design/changes-and-delivery.md#reports-and-artifacts) — a prose outcome for Agents to consume.
- [**Artifact**](docs/design/changes-and-delivery.md#reports-and-artifacts) — a durable visual outcome for the admiral.
- [**Change**](docs/design/changes-and-delivery.md#changes) — a proposed repository modification; on GitHub, this maps to a pull request and its branch.
- [**Quay**](docs/design/changes-and-delivery.md#the-quay) — the admiral's view of Changes waiting to land or settle.
- [**Landing**](docs/design/changes-and-delivery.md#landing-and-harvest) — durable acceptance of an Outcome; for a Change, merge is the landing event.
- [**Harvest**](docs/design/changes-and-delivery.md#landing-and-harvest) — work produced over an unattended stretch that is ready to review or ship.

## Agents and recovery

Owner: [Agent identity, resources, and recovery](docs/design/agent-recovery.md)

- [**Agent**](docs/design/agent-recovery.md#three-truths-three-lifecycles) — a durable identity and responsibility, not a process or provider conversation.
- [**Hail**](docs/design/agent-recovery.md#hailing-an-agent) — address an Agent by resuming it or establishing its execution context.
- [**Moorage**](docs/design/agent-recovery.md#reclamation-boundary) — an Agent's current replaceable resource home.
- [**Berth**](docs/design/agent-recovery.md#reclamation-boundary) — one repository worktree inside a Moorage.
- [**Siesta**](docs/design/agent-recovery.md#reclamation-boundary) — the reversible rest reached by standing an Agent down.
- [**Stand down**](docs/design/agent-recovery.md#reclamation-boundary) — drain an Agent to a safe holding point without retiring it.
- [**Retirement**](docs/design/agent-recovery.md#reclamation-boundary) — the explicit irreversible end of an Agent identity.
- [**Reconciliation**](docs/design/agent-recovery.md#durable-truth-and-disposable-execution) — repeatably compare durable truth with reality until they converge.
