# Design axioms

The conceptual law of Antumbra. [`ARCHITECTURE.md`](ARCHITECTURE.md) owns
process and package shape; this document owns the cross-context rules every
future design obeys. When a change conflicts with an axiom, the change is
wrong or the axiom is amended here—never silently.

[`GLOSSARY.md`](GLOSSARY.md) is the short product-language index. The
[`docs/design`](docs/design/README.md) guides own relationships, acts,
rationale, and recovery behavior within each bounded topic. Code, schemas, and
tests own exact implemented fields, states, wire names, and current behavior.

## Direction and work

- **Polaris is fixed; the course is not.** A Voyage moves toward a north star
  it never reaches. Its ephemeris, waypoints, and charters are revisable
  predictions made inside the cone of uncertainty, not promises.
- **Edges gate; Legs do not.** Dependency edges carry real ordering at Piece
  granularity. SIGHT, PLOT, SAIL, and DRIFT are the Voyage's sequential story;
  work crosses a Leg boundary whenever its edges allow.
- **Pieces are places, not processes.** A Piece is durable work with context,
  links, memory, questions, and zero or more typed Outcomes. Agents act for it
  through mortal Intents; nothing executes inside the Piece.
- **Work topology permits multiplicity.** Pieces depend on Pieces and link to
  assigned Agents, execution contexts, and Outcomes without one-to-one
  assumptions. Repositories are app-level registrations, not Piece containers.
- **Plans bend by editing typed links.** Promotion, parking, reordering,
  dependency edits, splitting, and merging change position without migrating
  durable substance.
- **Posture is durable direction.** It records the admiral's standing stance
  toward a governed subject so ordinary decisions can be inferred. It is never
  execution status; readiness, queueing, progress, and blockage are separate
  derived readings.
- **Done is derived, never declared.** Landed and pending Outcomes determine
  leaf completion; containers derive theirs. Done work stays in history and
  remains available for linked follow-ups.
- **Workers report; captains charter.** Proposed structure is not an Outcome.
  Agents return typed results; accountable captains decide the next work.

The [work and planning guide](docs/design/work-and-planning.md) owns the
detailed authority, course, Piece, dependency, and progress model.

## Agents and execution

- **An Agent is a durable responsibility.** It is independent of a process,
  replaceable resources, and any provider conversation. Sessions are the
  Agent's internal executive layer; exact Session state is not user vocabulary
  or an ordinary Fleet projection.
- **Agents are alive; Intents are events in their lives.** Spawn creates a
  pre-identified Agent with role and charter. Retire irreversibly ends that
  identity. A mortal Intent schedules an operation and never stands in for
  long-lived Piece demand.
- **Voyages sail by Piece launch, not play.** Launch records durable demand.
  Reconciliation creates or cancels dispatch attempts as eligibility changes;
  a blocked desired Piece needs no sleeping workflow.
- **Recovery resumes before it replaces.** Normal restart restores the same
  Agent, Antumbra Session, and provider-native conversation. A successor or
  fork is explicit, linked, and never invented from a missing process handle.
- **Sessions recede.** Humans and Agents hail, address, inspect, and direct the
  durable Agent and its work. Antumbra manages execution machinery beneath
  that surface.
- **Agents act through transport-free tools.** Domain acts are defined once as
  typed schemas and handlers, then adapted to each provider in process.
  Identity is bound at spawn and does not travel on a tool wire.

The [Agent recovery guide](docs/design/agent-recovery.md) owns resource,
Session, restart, siesta, handover, and reclamation behavior.

## Durable truth and presentation

- **Durable truth survives exit.** Domain records, identities, links,
  transcripts, and external observations live in persistence. Fibers, handles,
  subscriptions, timers, wakes, semaphores, and attempt history may disappear.
- **Workflows reconcile; they are never checkpointed.** Every attempt starts
  from durable intent and domain truth, then idempotently compares it with
  current runtime and external reality.
- **The event log is the product surface; views are glass.** Renderers are
  stateless typed projections that rehydrate from the log and subscribe without
  a read/write gap. Killing a view cannot affect an Agent or durable work.
- **One vocabulary serves many backends.** The domain owns neutral Session
  events and delivery acts; adapters preserve provider payloads and native ids
  without making them authoritative. A second backend must fit the same model
  before the interface can claim neutrality.
- **Unknown evidence stays evidence.** Raw or future event kinds render raw
  instead of taking the view down. Provider facts remain their own durable
  truth; observing a Change, Review, or message never invents another fact.
- **Approvals are decisions, not booleans.** When approval behavior ships, it
  must preserve who decided, what was decided, and the scope of that decision.

## Coordination and attention

- **Boards preserve coordination across attention gaps.** Durable entities
  have one append-only Board with rough and smooth salience registers. Boards
  never duplicate derivable database state and are never resource-reclamation
  targets.
- **Smoothing advances a frontier without erasing evidence.** It appends a
  provenance-bearing summary and conditionally moves the selected frontier;
  every source remains reachable.
- **Reach and interruption are different.** Questions and mail land durably
  before policy decides whether, when, and how to interrupt. In v1 the admiral
  chooses what an idle Agent receives; persisted facts do not wake one.
- **Questions stay where they arose.** A Question is a stable typed Board
  entry. Raises route that identity through authority; rulings and withdrawals
  derive its state, and precedent remains appended and supersedable.
- **Anyone may all stop.** Escalation can hold one asker, one Voyage, or the
  fleet. The system makes the stop loud and reliable; misuse is handled as a
  conversation afterwards.

The [attention and memory guide](docs/design/attention-and-memory.md) owns
Boards, smoothing, questions, rulings, mail, heave-to, and precedence.

## Outcomes and delivery

- **Outcomes are typed and audience-split.** Reports serve Agents, Artifacts
  serve the admiral, and Changes represent repository modifications that take
  time to land. The set of kinds is open, but every kind is individually typed.
- **Landing is a durable boundary.** A local Artifact must enter app-managed
  durable storage before it lands. A Change lands when its external host
  confirms merge. Resource cleanup never reclaims landed Outcomes.
- **External systems do not name our truth.** Antumbra keeps neutral Change
  identity and meaning beside a host's raw state. Host publication and
  observation are reconciled effects, not shortcuts around the domain.

The [changes and delivery guide](docs/design/changes-and-delivery.md) owns
Outcome relationships, Change stages, the Quay, and the GitHub mapping.

## Admission and resources

- **Submission never fails for system-state reasons.** Work is durably held
  with an observable status until admission permits it; hidden refusal is not
  holding.
- **Policies are the concept; pools are one application.** Typed conditions
  and restrictions compose. Freed capacity pulls by policy, priority class,
  focus, and durable demand; reclaiming resources outranks finishing work,
  which outranks starting more.
- **All deadlocks are soft.** Capacity retains margin and may overcommit loudly
  and temporarily to break a proven stall.
- **Wake is a latency hint, never a liveness dependency.** Startup, relevant
  events, and bounded patience all trigger idempotent reconciliation. A lost
  wake self-heals within the published patience bound.
- **Replaceable resources are evidence-bound.** Agents never create their own
  worktrees. A runner provisions their current Moorage and Berths; dirty,
  unpushed, unauthenticated, or uncertain evidence blocks automated reclaim.
  Age may choose among safe candidates but never makes an unsafe one safe.
- **Claims are ephemeral and visible.** Process-local ownership is rebuilt from
  durable work and direction after restart; missing memory never means work
  completed or a resource became free.
- **Resource holds live at the Agent tool boundary.** Repositories may
  contribute configuration, but Antumbra never wraps or weakens their own
  tooling to manufacture compliance.

## Standing principles

- **Simulability.** Domain verbs, state machines, admission, and coordination
  run under test with scripted Agents and zero model tokens.
- **Reify what must outlive an attention gap.** Intents carry compute gaps,
  Boards carry coordination gaps, mail carries delivery gaps, and Questions
  carry human-attention gaps.
- **Make the wrong thing unrepresentable.** Prefer closed transitions, typed
  state, derived truth, and idempotent convergence over warnings and fallback.
- **Defer what the cone hides.** Build one swappable pure seam for unknowable
  tuning and let use choose the setting; do not encode guesses as design law.
