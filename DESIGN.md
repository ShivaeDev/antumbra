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
- **Piece** — a bounded unit of work with zero-to-many typed outcomes.
  Pieces depend on pieces; every relation is M:N (piece↔repo, piece↔agent,
  piece↔session, piece↔outcome). Pieces produce artifacts.
- **Intent** — a kernel-scheduled bounded operation. The kernel executes the
  piece graph through intent admission. Intents are always mortal.
- **Agent** — a conceptual identity with a responsibility, persisting across
  sessions the way a program persists across process IDs.
- **Session** — one SDK session of an agent: an executor detail. Transcript
  and worktree survive it; a handover or fork starts a new session of the
  same agent.

Axioms of the stack:

- **Edges gate; legs don't.** Real ordering lives in the piece graph at piece
  granularity. Legs are the sequential story of a voyage; parallelism is
  sibling voyages. Work crosses a leg boundary early wherever edges allow.
- **Pieces are places, not processes.** A piece is a rich domain entity —
  board, links, questions, intent history, revisable outcome expectations —
  but nothing executes inside it. Everything that happens to a piece is an
  agent acting on its behalf, one mortal intent at a time.
- **Charters are dead reckoning, not contracts.** A piece's stated outcome is
  an estimate, revised as reality arrives.
- **Outcomes are polymorphic and audience-split.** Reports are prose for
  agents; artifacts are visual, for the human. Further kinds (pull requests,
  external references, prepared worktrees) register through plugins — the
  set is open, every kind individually typed. Proposed structure is never an
  outcome kind: **workers report; captains charter.**
- **Plans bend.** Typed concepts with transformation verbs — promote, park,
  reorder, rewire, split, merge — over any universal substrate. Position is
  expressed as links, verbs edit links, substance never migrates.
- **Done is derived, never declared.** Leaf work completes when its outcomes
  land; containers derive doneness and are never marked. Done is not gone:
  finished work is resumable as linked follow-ups. History is appended,
  never mutated.
- **Repos and worktrees are resources, not containers.** A cross-repo piece
  gets one agent with one worktree per repo. Never bake in one-piece-one-repo,
  one-session-one-worktree, or one-piece-one-PR.
- **Agents are alive; intents are events in their life.** The kernel
  schedules the moments — spawn brings an agent into being with a role, a
  charter, and pre-assigned identity; retire ends it — never the living.
  There is no turn in the domain: activity is a stream of events, load is a
  level, and quiescence is a derived gauge no one awaits — completion is not
  in the ontology of conversation. Admission governs births, not messages;
  messages to living agents stay unshipped until their delivery semantics
  are ruled.
- **The event log is the product surface; views are glass.** The renderer is
  a stateless projection fed by one typed contract: every view rehydrates
  from the log and stays current by subscription, so killing a view touches
  nothing and an agent never notices being watched. The transcript is a pure
  derivation of the wire-event sequence — assistant blocks accumulate, tool
  calls pair with their results, terminal events render as telemetry
  dividers (rhythm for human eyes, never a boundary the system acts on),
  unknown kinds render raw instead of failing. New events reach observers
  through a pubsub beside the write; subscribers subscribe first, read the
  log, and dedup by sequence, so nothing falls in the gap. Views may only
  offer acts the domain already has — spawn, retire, interrupt; a reply box
  would smuggle delivery semantics past the axiom above.

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
- **Sessions fork.** Transcripts are durable data; any point is resumable
  under a new identity, cheaply. Fork when the context is the value; smooth
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
  gets a moorage: a folder that is the agent's cwd and scratchpad, holding
  one berth (a worktree on a `work/…` branch, cut from a bare mirror under
  the app's data dir) per requested repo — zero repos means a bare scratch
  moorage. The runner provisions before the session opens. Reclaim is
  clean-only: a berth with uncommitted or unpushed work is stranded and
  surfaced, never auto-deleted, and only strands older than seven days are
  scrapped. Runners register through the plugin surface like backends; the
  local runner's terminal capability stays honestly false until something
  can render a terminal.
- Resource claims are ephemeral, visible, and rebuilt: exposed to the
  observability surface, never persisted. After a restart the system
  presents what was under way rather than blindly re-inflating it.
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
