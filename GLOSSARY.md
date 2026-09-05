# Glossary

Antumbra uses a small product vocabulary so a chart, a conversation, and the app can mean the same thing. This is an index, not an encyclopedia: each
term links to the one design guide that explains its relationships and behavior. Code and schemas remain the authority for exact fields and states.

## Work and planning

Owner: [Work and planning](docs/design/work-and-planning.md)

- [**Admiral**](docs/design/work-and-planning.md#authority-and-staffing) — the human who directs the fleet without conning a ship.
- [**Captain**](docs/design/work-and-planning.md#authority-and-staffing) — the Agent role accountable for one Voyage.
- [**Crew**](docs/design/work-and-planning.md#authority-and-staffing) — Agents assigned to a Voyage's Pieces.
- [**Role**](docs/design/work-and-planning.md#authority-and-staffing) — a named kind of agent — flagship, captain, crew — and the backend, model, and
  effort it sails on.
- [**Polaris**](docs/design/work-and-planning.md#voyages-and-their-course) — the fixed north star a Voyage moves toward but never reaches.
- [**Voyage**](docs/design/work-and-planning.md#voyages-and-their-course) — a ship under sail for an objective, with its charted work and memory.
- [**Ephemeris**](docs/design/work-and-planning.md#ephemerides-and-the-cone-of-uncertainty) — a revisable forecast of the course, not a promise.
- [**Cone of uncertainty**](docs/design/work-and-planning.md#ephemerides-and-the-cone-of-uncertainty) — the horizon inside which waypoints can be
  chosen honestly.
- [**Leg**](docs/design/work-and-planning.md#legs) — one SIGHT, PLOT, SAIL, DRIFT planning loop.
- [**Piece**](docs/design/work-and-planning.md#pieces) — a bounded place for durable work and its outcomes.
- [**Occultation**](docs/design/work-and-planning.md#occultations-and-dependency-blockage) — a high-level obstacle in the plan, distinct from a Piece
  being dependency-blocked.
- [**Posture**](docs/design/work-and-planning.md#posture-readiness-and-progress) — the admiral's standing direction toward a governed subject, never
  execution status.

## Attention and memory

Owner: [Attention and memory](docs/design/attention-and-memory.md)

- [**Board**](docs/design/attention-and-memory.md#boards-and-registers) — an entity's durable place for memory and addressed signal.
- [**Rough log**](docs/design/attention-and-memory.md#boards-and-registers) — the Board register for high-volume working context.
- [**Smooth log**](docs/design/attention-and-memory.md#boards-and-registers) — the Board register for distilled successor context.
- [**Smoothing**](docs/design/attention-and-memory.md#smoothing) — advancing a Board's useful frontier without erasing its sources.
- [**Summary**](docs/design/attention-and-memory.md#smoothing) — a smooth entry that stands in for the span of rough entries it covers.
- [**Smoother**](docs/design/attention-and-memory.md#smoothing) — the constrained role that reads a Board's rough entries and writes its summaries.
- [**Attention lanes**](docs/design/attention-and-memory.md#attention-lanes) — escalation, decision point, finding, and grievance.
- [**Heave to**](docs/design/attention-and-memory.md#heave-to) — discussion mode that keeps the Agent's context from moving on.
- [**Precedence**](docs/design/attention-and-memory.md#mail-and-precedence) — routine, priority, and flash ordering for Agent mail.
- [**Hold**](docs/design/attention-and-memory.md#holds) — a stop on what Antumbra sends by itself, per kind or all at once, that leaves running work
  alone; distinct from a _held_ Piece, which is chartered and not yet launched.

## Rulings

Owner: [Rulings](docs/design/rulings.md)

- [**Ruling**](docs/design/rulings.md#the-ruling-record) — one typed record binding the context, the question, and the answer an authority gives; an
  agent requests it, a captain or the admiral rules on it.

## The flagship

Owner: [The flagship](docs/design/flagship.md)

- [**Flagship**](docs/design/flagship.md#the-flagship-voyage) — the one Voyage carrying the fleet's own north star, Board, and highest-level captain.

## Changes and delivery

Owner: [Changes and delivery](docs/design/changes-and-delivery.md)

- [**Outcome**](docs/design/changes-and-delivery.md#outcomes) — a typed result a Piece expects and eventually lands.
- [**Report**](docs/design/changes-and-delivery.md#reports-and-artifacts) — a prose outcome for Agents to consume.
- [**Artifact**](docs/design/changes-and-delivery.md#reports-and-artifacts) — a durable visual outcome for the admiral.
- [**Change**](docs/design/changes-and-delivery.md#changes) — a proposed repository modification that takes time to land.
- [**Quay**](docs/design/changes-and-delivery.md#the-quay) — the admiral's view of Changes waiting to land or settle.
- [**Landing**](docs/design/changes-and-delivery.md#landing-and-harvest) — durable acceptance of an Outcome.
- [**Harvest**](docs/design/changes-and-delivery.md#landing-and-harvest) — work produced over an unattended stretch that is ready to review or ship.

## Agents and recovery

Owner: [Agent identity, resources, and recovery](docs/design/agent-recovery.md)

- [**Agent**](docs/design/agent-recovery.md#three-truths-three-lifecycles) — a durable identity and responsibility, not a process or provider
  conversation.
- [**Session**](docs/design/agent-recovery.md#three-truths-three-lifecycles) — one provider execution owned by an Agent; the root session is the one
  the Agent runs directly, and subsessions nest beneath it.
- [**Subsession**](docs/design/agent-recovery.md#activity-observation-and-delivery) — a nested provider conversation a session spawns through a tool
  call; part of the session's own record, forming a tree, and never an Agent.
- [**Origin**](docs/design/agent-recovery.md#activity-observation-and-delivery) — the stamp saying which node of a session's tree produced an event;
  absent on the root's own turns.
- [**Gap**](docs/design/agent-recovery.md#activity-observation-and-delivery) — a place the record admits it stopped seeing; the kinds are a closed
  set, and a loss with no kind of its own is unknown.
- [**Completeness**](docs/design/agent-recovery.md#activity-observation-and-delivery) — what a session's record says about itself: recording while it
  is still being written, complete when its gap ledger is empty, incomplete when it is not, and unaudited for rows that closed before gaps were
  tracked.
- [**Session outcome**](docs/design/agent-recovery.md#activity-observation-and-delivery) — how a delegated conversation stopped, in the four words
  Antumbra owns: completed, failed, interrupted, or unknown.
- [**Audit**](docs/design/agent-recovery.md#activity-observation-and-delivery) — asking a backend what it still holds about work its stream has
  stopped carrying; it reads and never attaches.
- [**Census**](docs/design/agent-recovery.md#activity-observation-and-delivery) — the audit that asks which subsessions a root spawned, so work the
  stream never carried is still counted.
- [**Hail**](docs/design/agent-recovery.md#hailing-an-agent) — address an Agent by resuming it or establishing its execution context.
- [**Moorage**](docs/design/agent-recovery.md#provisioning-and-resource-topology) — an Agent's current replaceable resource home.
- [**Berth**](docs/design/agent-recovery.md#provisioning-and-resource-topology) — one repository worktree inside a Moorage.
- [**Idle**](docs/design/agent-recovery.md#rest-and-reaping) — a Session whose turn has ended; it stays attached, listening, and reachable, and its
  own unread mail wakes it.
- [**Siesta**](docs/design/agent-recovery.md#rest-and-reaping) — the reversible rest an idle Session is put into by the clock or by the admiral; its
  process is reclaimed and speaking to it wakes it.
- [**Stranded**](docs/design/agent-recovery.md#rest-and-reaping) — a Session whose process is gone with its work unfinished; nothing resumes it, and a
  hail or a send is what takes it back up.
- [**Wake**](docs/design/agent-recovery.md#resume-before-replace) — the one act that puts a Session back on a provider; only a hail, a send, or a
  Piece already assigned to that Session asks for one.
- [**Retirement**](docs/design/agent-recovery.md#reclamation-boundary) — the explicit irreversible end of an Agent identity.
- [**Reconciliation**](docs/design/agent-recovery.md#durable-truth-and-disposable-execution) — repeatably compare durable truth with reality until
  they converge.
