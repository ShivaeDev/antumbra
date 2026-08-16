# Design axioms

The conceptual law of the system. `ARCHITECTURE.md` says what the pieces are;
this document says what the concepts mean and which rules bind every future
design. When a change and an axiom conflict, the change is wrong or the axiom
gets amended here — never silently.

## The stack

- **Polaris / north star** — the vision a voyage steers by. Fixed; never
  reached. You move toward it.
- **Voyage** — the top-level object: north star + context + pieces + boards.
  Spans repos; nests and links other voyages. Following one north star
  reveals another. Voyages may be eternal.
- **Leg** — one pass of the loop: SIGHT (measure reality) → PLOT (revise the
  roadmap, pick waypoints) → SAIL (execute without re-planning every gust) →
  DRIFT (measure planned-vs-actual, feed the next sighting).
- **Piece** — a bounded unit of durable work with zero-to-many typed outcomes.
  Its human posture records demand, not execution. Pieces depend on pieces;
  every relation is M:N (piece↔repo, piece↔agent, piece↔session,
  piece↔outcome). Pieces produce artifacts.
- **Intent** — a kernel-scheduled bounded operation. The kernel executes the
  piece graph through intent admission. Intents are always mortal and never
  stand in for long-lived Piece demand.
  The intent record and affected domain rows are the durable authority;
  execution progress is reconstructed from them after restart, not persisted
  as execution checkpoints.
- **Agent** — a durable identity with a responsibility, independent of any
  process, replaceable workspace, or provider session.
- **Session** — one durable execution context bound to one provider-native
  session or thread. An Agent may own a succession of Sessions, and a Piece
  may involve several Agents. Process attachments may die and resume the same
  Session; a handover or fork is an explicit new Session, never crash recovery.

Axioms of the stack:

- **Edges gate; legs don't.** Real ordering lives in the piece graph at piece
  granularity. Legs are the sequential story of a voyage; parallelism is
  sibling voyages. Work crosses a leg boundary early wherever edges allow.
- **Pieces are places, not processes.** A piece is a rich domain entity —
  board, links, questions, intent history, revisable outcome expectations —
  but nothing executes inside it. Everything that happens to a piece is an
  Agent acting on its behalf through mortal Intents.
- **Charters are dead reckoning, not contracts.** A piece's stated outcome is
  an estimate, revised as reality arrives.
- **Outcomes are polymorphic and audience-split.** Reports are prose for
  agents; artifacts are visual, for the human; a **change** is a proposed
  modification to a repo, on a branch, and it takes its time to land — it
  passes through stages, `prepared`, `open`, `landed`, `withdrawn`, before it
  counts. Where a change lives is a **host**: GitHub's pull request is the
  first, another host may call it something else, and hosts register through
  the plugin API exactly as backends and runners do. The core owns the
  concept and one neutral vocabulary for it, and stores the host's own state
  raw beside it, so a second host maps onto the same reading and no consumer
  learns which host it is looking at. Raw Change and Review facts remain their
  own durable truth: observing one never turns it into mail and never directly
  wakes or interrupts an Agent. Further kinds (external references,
  prepared worktrees) register the same way — the set is open, every kind
  individually typed. Proposed structure is never an outcome kind:
  **workers report; captains charter.**
  A local artifact lands only after its bytes are published into app-managed
  durable storage; reclaiming the Agent's Moorage or Berths never reclaims a
  landed outcome. An external URL remains a reference to external custody.
- **Plans bend.** Typed concepts with transformation verbs — promote, park,
  reorder, rewire, split, merge — over any universal substrate. Position is
  expressed as links, verbs edit links, substance never migrates.
- **Done is derived, never declared.** Leaf work completes when at least one
  of its outcomes has landed and none is still pending; containers derive
  doneness and are never marked. A piece whose only unmet outcome is a pending
  change is **landing** — out of the pool, no crew, waiting on the host. Done
  is not gone: finished work is resumable as linked follow-ups. History is
  appended, never mutated.
- **Repos and worktrees are resources, not containers.** A cross-repo piece
  may have several Agents; each gets one worktree per repo. Never bake in
  one-piece-one-repo, one-session-one-worktree, or one-piece-one-change. Repos
  are registered once, at the app level, each with its bare mirror; every spawn
  gets a berth per registered repo, so no piece or voyage carries a repo list.
  Narrowing which repos an agent sees is a later filter, never a per-piece
  binding.
- **Voyages sail by launch, not by play.** Every voyage has a captain — a
  named, durable agent hailed for it, who charters its pieces. There is no
  voyage-level play or pause: a voyage is under way because its captain is
  at work. Launching is per Piece and records durable desired posture —
  *release into the pool*. A desired Piece may remain blocked with no running
  workflow. Reconciliation creates a mortal dispatch Intent only when its
  edges and admission allow work, cancels that Intent if the Piece becomes
  blocked or parked before starting, and creates a new one when demand becomes
  eligible again. The captain launches by tool and the admiral by window; both
  express the same durable demand.
- **Agents act back through tools on the backend port.** Landing an outcome,
  writing a board, standing down: these are tools every session receives at
  open, defined once in a transport-free package (schemas and handlers into
  the domain, blind to any harness) and mapped by each backend adapter onto
  its provider's own tool mechanism, in-process. Identity is bound at spawn;
  nothing about who is calling travels on the wire. A network face for
  non-local consumers is an addition to that package, never a substitute.
- **Agents are alive; intents are events in their life.** The kernel
  schedules the moments — spawn brings an agent into being with a role, a
  charter, and pre-assigned identity; retire irreversibly ends it — never the
  living. Stand-down is a reversible drain to siesta, not retirement.
  There is no turn in the domain: activity is a stream of events, load is a
  level, and quiescence is a derived gauge no one awaits — completion is not
  in the ontology of conversation. Admission governs births, not messages;
  mail is durably addressed to an agent and marked read in mailbox truth,
  while transport into a session is a separate, at-least-once effect.
- **The event log is the product surface; views are glass.** The renderer is
  a stateless projection fed by one typed contract: every view rehydrates
  from the log and stays current by subscription, so killing a view touches
  nothing and an agent never notices being watched. The transcript is a pure
  derivation of the session-event sequence — messages accumulate, tool
  starts pair with their completions, usage and turn events render as
  telemetry dividers (rhythm for human eyes, never a boundary the system
  acts on), raw and unknown kinds render raw instead of failing. New events
  reach observers through a pubsub beside the write; subscribers subscribe
  first, read the log, and dedup by sequence, so nothing falls in the gap.
  Views may only offer acts the domain already has — spawn, retire,
  interrupt; a reply box would smuggle delivery semantics past the axiom
  above.
- **One vocabulary, many backends.** The domain owns a small, neutral
  session-event vocabulary — session opened, message, thinking, tool started
  and completed, usage, turn completed, raw — and every agent backend maps
  its provider's wire protocol onto it, carrying the provider payload
  alongside so the log stays the wire truth. Consumers are backend-blind by
  construction: nothing above a backend adapter may know a provider's shape.
  A backend's own session or thread id is exposed on the handle and stored
  beside ours, but our record id is the authority — no backend gets to name
  our sessions. Delivery has two verbs on every backend, steer (into the
  running turn) and queue (at the next full-turn boundary); which one a
  caller uses is precedence policy the domain owns, never the backend's.
  Approvals, when they ship, are decision objects, never booleans. The
  second backend exists to prove all of this: an interface shaped from one
  provider is a lie until a second one fits it.

## Authority

- The human is the **admiral**: oversees all voyages, rules, allocates —
  and cons no ship. Each voyage may have a **captain**: an agent, the
  accountable address of that voyage. Fleet-level concerns live on the
  **flagship** — a distinguished voyage whose north star is the fleet
  sailing well; it has its own captain.
- **Hailing** materializes a role for conversation: a standing identity
  where one exists, else a fresh context over the durable record. Every
  voyage is addressable as if crewed; almost none pay for a crew.
- Agents are named where responsibility is durable, rostered where
  interchangeable. Work is chartered to agents; agents do not shop for work.
- **Sessions recede.** The human thinks in problems — voyages, focus,
  rulings — never in sessions. Sessions are plumbing the system manages.

## Attention

The human's focus is a scheduled resource, handled by the same philosophy as
compute: reify, queue, prioritize, preempt.

- Four lanes: **escalation** (blocking; always reaches the admiral),
  **decision point** (a ruling is wanted; work continues), **finding**
  ("not my job, but someone should know" — addressed to a scope, never a
  person), **grievance** (vented, reviewed in aggregate).
- Escalation scopes: hold-self, hold-voyage, **all stop** — anyone, at any
  depth, may halt everything until a ruling lands. Loud by design; misuse is
  a conversation afterwards, not a reason to gate it.
- **A question is a durable object** — its own small board, climbing and
  descending the authority ladder, gathering context, takes, and severity
  relabels. An ask declares an addressee and an importance, per hop; it
  never declares whether it interrupts. Interruption is computed from
  importance × the addressee's **posture** (on deck / meetings / overnight).
  Interrupt ≠ reach: everything always lands on the board.
- **Rulings are precedent**: scoped, supersedable, appended. A ruling
  attaches to the board of the scope it declares — posted where it binds.
  Rulings exist at every authority level; a captain's rulings are an audit
  trail the admiral can walk and overrule. Agents check precedent before
  asking.
- Questions on reversible decisions may time out — expiry re-raises them
  down the ladder for a provisional ruling. Expensive-to-undo decisions
  never time out.
- **Heave to**: the discussion mode. The agent settles, the conversation
  becomes its only traffic, and held messages flow afterwards — coalesced,
  in precedence order. Message precedence: routine and priority wait for a
  full idle turn; flash alone steers in mid-turn.
- **v1 attention is human-selected.** A pull view may rank addressed mail and
  relevant Change, Review, and Question facts, but the admiral chooses what an
  idle Agent receives. Persisting a fact never selects work or resumes anyone.

## Boards and memory

- Durable entities (voyages, pieces, repos, agents) carry **boards** other
  entities can write to. Two registers: the **rough log** (high-volume
  scratch) and the **smooth log** (distilled learnings). Salience, not
  access control.
- **Smoothing** is the cleanup verb: a disposable fresh-context session
  rewrites a board, keeping the still-relevant, dropping the derivable.
  If everything is durable, nothing is signal.
- **Never duplicate the derivable.** Boards do not record what the database
  already knows.
- Explicitly addressed mail is an immutable entry on the addressee's Agent
  Board. Its stable source identity makes replay harmless; reading it and
  marking it read are separate durable acts, neither of which means handled.
- **Boards and story are not resources.** Resource reclamation never erases
  their history.
- **Recovery never forks.** Normal recovery resumes the same agent, Antumbra
  session, and provider-native session or thread. Forking is an explicit new
  identity when the context is the value; smoothing is the explicit operation
  when the context is the cost.
- Blackboard state, declarative wakeups, bounded direct messages, and typed
  artifact handoffs are the coordination rails. Deterministic coordination
  lives in software; judgment lives in agents. When in doubt, write to the
  board, not to a person.

## Resources and admission

- **Submission never fails for system-state reasons.** Everything is held,
  not refused — and held-not-refused is only tolerable when the holding is
  observable.
- **Policies are the concept; pools are the special case.** A policy is a
  typed pair — a condition under which it fires, a restriction while it
  fires — composed additively. Capacity counts, machine signals, and
  workflow states are all policy families; plugins may register kinds.
- **Pools pull.** Work lands in pools; held is the default state, not an
  event. Freed capacity pulls by policy × priority class × focus × demand.
  Priority class is a property of the intent kind, never a stored column.
  Pick order: reclaim > finish > start — free capacity first, complete work
  second, begin work last.
- **All deadlocks are soft.** Capacities carry margin; on stall the pool
  deliberately overcommits — loudly, temporarily — until the knot clears.
- **Wake liveness is bounded patience, not signal discipline.** Every
  scheduler wait times out — a published deadline when one exists, a patience
  floor otherwise — so wake signals are latency hints, never liveness
  dependencies. A lost wakeup self-heals within one patience period, and
  orderings that make handoff instant stay optimizations, never invariants.
  Simulation asserts the budget: admit latency never exceeds patience.
- **Sleep.** A session is reapable only at true idle; in-flight sub-agent
  trees are never interrupted. Everything long-lived is externalized —
  monitors become event subscriptions, pending questions live on the board,
  mail waits in the mailbox — so sessions are reapable by construction.
  Under pressure, sleep doubles as eviction: reap the holders least likely
  to wake soon. **The durable concepts exist precisely so that sessions can
  die at any moment.**
- **Agents never create their own worktrees — they are moored.** Every spawn
  has one durable current moorage: a folder that is the agent's cwd and
  scratchpad,
  holding one berth (a worktree on a `work/…` branch, cut from a bare mirror
  under the app's data dir) per registered repo — no repos registered means a
  bare scratch moorage. The runner provisions before a session opens. The
  same Moorage row may be reclaimed and later reprovisioned without replacing
  its Agent; ordinary provisioning reconciles that row with whatever physical
  resources remain. Reclaim is evidence-bound: uncommitted or unpushed work,
  unavailable authentication, or uncertain state blocks automation;
  gitignored paths are declared disposable and do not strand it. Age may
  influence policy but never proves safety. Runners register through the
  plugin surface like backends; the local runner's terminal capability stays
  honestly false until something can render a terminal.
- Resource claims are ephemeral, visible, and rebuilt: exposed to the
  observability surface, never persisted. After restart, the system derives
  them from durable work and posture rather than treating missing process
  state as completion.
- Mid-flight resource holds intercept at the agent SDK's pre-tool layer —
  never by wrapping a repository's own tooling. Repos may contribute
  configuration, never mechanism.

## Standing principles

- **Simulability.** The domain layer — verbs, state machines, admission,
  boards — runs under test with scripted agents and zero model tokens. A
  design that only reveals its behavior when a real model runs is the wrong
  design.
- **Reify everything that must outlive an attention gap**: intents for
  compute gaps, boards for coordination gaps, mail for delivery gaps,
  questions for the human's attention gaps.
- **Make the wrong thing unrepresentable** before making it discouraged:
  closed transition tables, derived doneness, computed interruption.
- **Defer what the cone hides.** Tuning questions (cadences, weightings,
  thresholds) are answered by building the seam — one swappable pure
  function — and letting use pick the setting. Deciding them up front is
  plotting outside the cone of what is knowable.
