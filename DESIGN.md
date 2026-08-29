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
  links, memory, and zero or more typed Outcomes. Agents act for it
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
- **Every Voyage is accountable and addressable.** It has an accountable
  captain and can be hailed as if crewed, materializing a standing identity or
  a fresh context over the durable record without requiring permanent crew.
- **Work is chartered, never shopped.** Captains assign work to Agents; Agents
  do not select work for themselves from a pool.
- **The fleet sails on one flagship.** Exactly one Voyage's kind is flagship;
  its north star is the fleet's and its Board is the fleet Board, so there is
  no fleet record beside the Voyages. Its captain is the highest-level agent
  in the fleet, answers rulings of fleet radius, and acts for the admiral
  through ordinary domain acts rather than private ones.

The [work and planning guide](docs/design/work-and-planning.md) owns the
detailed authority, course, Piece, dependency, and progress model. The
[flagship guide](docs/design/flagship.md) owns the flagship Voyage, its
captain, and what that captain answers and does.

## Agents and execution

- **An Agent is a durable responsibility.** It is independent of a process,
  replaceable resources, and any provider conversation. Sessions are the
  Agent's internal executive layer; exact Session state is not user vocabulary
  or an ordinary Fleet projection. Where the record's own words must reach a
  reader at all — how a delegated node ended, how whole its record is — the
  renderer says them in English rather than passing the stored token through.
- **Agents are alive; Intents are events in their lives.** Spawn creates a
  pre-identified Agent with role and charter. Retire irreversibly ends that
  identity. A mortal Intent schedules an operation and never stands in for
  long-lived Piece demand.
- **Activity has no turns in the domain.** Agent activity is an event stream,
  load is a level, and quiescence is a derived gauge no workflow awaits.
  Provider turn events are telemetry, not a completion ontology. Admission
  governs Agent births, never message delivery. Mail is durable truth;
  transport into execution is a separate, at-least-once effect.
- **Voyages sail by Piece launch, not play.** Launch records durable demand.
  Reconciliation creates or cancels dispatch attempts as eligibility changes;
  a blocked desired Piece needs no sleeping workflow.
- **Recovery resumes before it replaces.** A wake restores the same Agent,
  Antumbra Session, and provider-native conversation. It is asked for — a hail,
  a send, or a Piece assigned to that Session — and never guessed at by a timer
  or a boot pass; a Session whose process went with work unfinished is shown as
  stranded until somebody hails it. A successor or fork is explicit, linked, and
  never invented from a missing process handle.
- **Sessions recede.** Humans and Agents hail, address, inspect, and direct the
  durable Agent and its work. Antumbra manages execution machinery beneath
  that surface.
- **Agents act through transport-free tools.** Domain acts are defined once as
  typed schemas and handlers, injected when an execution context opens, then
  adapted to each provider in process. Identity is bound at spawn and does not
  travel on a tool wire. A network face may add another consumer; it never
  replaces the in-process capability.

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
  stateless typed projections. They subscribe first, read the durable log, and
  deduplicate by sequence so observation has no gap. Views may offer only
  existing domain acts; killing one cannot affect an Agent or durable work.
  The glass remembers nothing, so main remembers where it was pointed: a
  window's role is minted when it opens and never travels in its address, and
  the arrangement of windows is shell state main writes down, not something a
  view keeps or a reload can invent.
- **One vocabulary serves many backends.** The domain owns neutral Session
  events and delivery acts; adapters preserve provider payloads and native ids
  without making them authoritative. A second backend must fit the same model
  before the interface can claim neutrality.
- **Every backend has both delivery boundaries and one reading surface.**
  `steer` enters running work; `queue` waits for the next full provider
  boundary, and the domain's precedence policy chooses between them, never the
  adapter. Beside them every backend answers an `audit` — a census of what a
  root spawned and an audit of one node — which reads stored work, never
  attaches, and reports what it finds as ordinary Session events.
- **Unknown evidence stays evidence.** Raw or future event kinds render raw
  instead of taking the view down. Provider facts remain their own durable
  truth; observing a Change, Review, or message never invents another fact.
- **Approvals are decisions, not booleans.** When approval behavior ships, it
  must preserve who decided, what was decided, and the scope of that decision.

## Coordination and attention

- **Human attention is a scheduled resource.** Antumbra reifies, queues,
  prioritizes, and preempts demands on focus with the same discipline it uses
  for compute, while v1 leaves the final selection to the admiral.
- **Boards preserve coordination across attention gaps.** Durable entities
  have one append-only Board with rough and smooth salience registers. Boards
  never duplicate derivable database state and are never resource-reclamation
  targets.
- **Smoothing advances a frontier without erasing evidence.** It appends a
  provenance-bearing summary and conditionally moves the selected frontier;
  every source remains reachable.
- **Reach and interruption are different.** Ruling requests and mail land
  durably before policy decides whether, when, and how to interrupt. In v1 the
  admiral chooses what an idle Agent receives; persisted facts do not wake one.
- **A Ruling is a record, not a Board entry.** One typed record binds the
  context, the question, and the answer, and the answer is read in the light
  of its question. The Board keeps the free-form log and the small asks between
  agents; rulings have their own lifecycle and typed scope.
- **Rulings climb the ladder on two declared axes.** Radius says how widely
  the answer applies and which authority may give it; urgency says whether
  the asker holds. Every captain on the way up may rule within its radius,
  add context, or reclassify by appending; the admiral overrules by
  superseding, never by editing.
- **A Ruling gates work as its own node.** Pieces may depend on an open
  ruling as they depend on Pieces; blockage is derived and readiness returns
  when it is ruled. A Ruling is never an Outcome and is owned by no Piece or
  Voyage.
- **Standing rulings are smoothed, never edited.** Reclassification,
  consolidation, and retirement append with provenance, and dedicated agents
  do that work rather than captains.
- **Anyone may all stop.** Escalation can hold one asker, one Voyage, or the
  fleet. The system makes the stop loud and reliable; misuse is handled as a
  conversation afterwards.
- **Coordination uses settled rails.** Board entries hold shared state,
  declarative wakeups request reconciliation, direct messages remain bounded,
  and typed Artifact handoffs carry results. Software owns deterministic
  coordination; Agents supply judgment.

The [attention and memory guide](docs/design/attention-and-memory.md) owns
Boards, smoothing, mail, heave-to, and precedence. The
[rulings guide](docs/design/rulings.md) owns the Ruling record, its axes and
subjects, the authority ladder, gating, smoothing, and reach.

## Outcomes and delivery

- **Outcomes are typed and audience-split.** Reports serve Agents, Artifacts
  serve the admiral, and Changes represent repository modifications that take
  time to land. The set of kinds is open, but every kind is individually typed.
- **Landing is a durable boundary.** A local Artifact must enter app-managed
  durable storage before it lands. A Change lands when host evidence confirms
  the host-specific acceptance mapped by its adapter. Resource cleanup never
  reclaims landed Outcomes.
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
  focus, and durable demand. Priority class belongs to the Intent kind and is
  never stored as mutable work state. Reclaiming resources outranks finishing
  work, which outranks starting more. Plugins may register further policy
  families without changing admission's meaning.
- **All deadlocks are soft.** Capacity retains margin and may overcommit loudly
  and temporarily to break a proven stall.
- **Wake is a latency hint, never a liveness dependency.** Startup, relevant
  events, and bounded patience all trigger idempotent reconciliation. A wait
  uses a published deadline when one exists and a patience floor otherwise; a
  lost wake self-heals within that bound. Simulation proves admission latency
  never exceeds the patience budget.
- **Repository resources are app-level and capability-honest.** Every
  registered repository has one app-managed bare mirror, and each spawn gets
  one Berth for each registration. Runners expose only capabilities they can
  actually provide; repositories and Pieces never smuggle in resource policy.
- **Reaping waits for settled execution.** A Session with an in-flight tool,
  descendant Agent tree, or background obligation is never interrupted for
  sleep. Pressure selects among safe candidates by likelihood of waking again;
  durable concepts make the eventual loss of any process attachment safe.
- **Replaceable resources are evidence-bound.** Agents never create their own
  worktrees. A runner provisions their current Moorage and Berths; dirty,
  unpushed, unauthenticated, or uncertain evidence blocks automated reclaim.
  Age may choose among safe candidates but never makes an unsafe one safe.
- **Claims are ephemeral and visible.** Process-local ownership is rebuilt from
  durable work and direction after restart; missing memory never means work
  completed or a resource became free.
- **Resource holds live at the Agent's pre-tool boundary.** Repositories may
  contribute configuration, but Antumbra never wraps or weakens their own
  tooling to manufacture compliance.

## Standing principles

- **Simulability.** Domain verbs, state machines, admission, and coordination
  run under test with scripted Agents and zero model tokens.
- **Reify what must outlive an attention gap.** Intents carry compute gaps,
  Boards carry coordination gaps, mail carries delivery gaps, and Rulings
  carry decision gaps.
- **Make the wrong thing unrepresentable.** Prefer closed transitions, typed
  state, derived truth, and idempotent convergence over warnings and fallback.
- **Defer what the cone hides.** Build one swappable pure seam for unknowable
  tuning and let use choose the setting; do not encode guesses as design law.
