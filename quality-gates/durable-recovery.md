# Durable Recovery

Long-running work crosses process, provider, authentication, and machine failures. This gate checks that disappearing execution machinery cannot
rewrite durable truth. The governing concepts are in [`docs/design/agent-recovery.md`](../docs/design/agent-recovery.md).

## Rules

1. Persist everything that remains true after exit. Keep only fibers, handles, subscriptions, timers, wakes, workflow history, and rebuildable indexes
   in memory. If memory vanished after any effect, durable state must still tell the truth.
2. Restart every workflow attempt from durable intent and domain state. Steps reconcile idempotently; persisted execution checkpoints are forbidden.
3. Keep Agent identity, current replaceable resources, AgentSession provider conversation, work posture, and process attachment as separate concerns.
   Success or failure in one changes another only through an explicit domain transition.
4. Keep Piece demand separate from executable attempts. A dependency-blocked desired Piece has no dispatch Intent; waiting is only for an active
   attempt needing immediate external intervention. Reconciliation cancels a queued attempt that becomes blocked and submits a new one when demand is
   eligible.
5. Name success at the promised durable boundary. Write the required durable transition and its evidence before reporting success. A transport send is
   never receipt or read evidence.
6. Absence is not a terminal event. An empty registry, closed process, dead watcher, or lost subscription never proves completion, closure,
   retirement, orphaning, or release. Provable death is the one carve-out, and it is a predicate rather than a silence: the boot reconciler may close
   a subsession node with outcome `unknown` only when the root row it hangs from is itself closed and the owning Agent is gone — missing, not alive,
   or pointing at a different current Session. Anything undecidable leaves the node open, including a root that cannot be read and an Agent status
   that cannot be decoded. The record then says it never found out; it never says the work finished.
7. Resume every assigned Agent, root AgentSession, provider-native session or thread, native reference, and event sequence before spawning a
   replacement. The root Session is the resumable unit: a subsession belongs to its root's record, is never addressed on its own, and is never a
   resume, drain, or stop target. Preserve M:N assignments and Session succession; never recover an arbitrary first row or replay the neutral event
   log as provider context. A successor is explicit recovery policy, never silent fallback. At most one root Session per Agent is open at a time, and
   a violation heals by rule rather than by choice: keep the Session the Agent points at when it is a valid open root, otherwise the newest by
   `createdAt` with the larger id breaking a tie, and close the rest. A child is refused an attachment at two seams — the domain refuses a Session id
   that is not a root, and the backend refuses a provider thread it knows to be a node — so no caller holding a child's reference reaches a live
   attachment with it, however it came by the id.
8. Initial and recovery instructions use at-least-once transport: retry when provider acceptance is unknown and make duplicates harmless. Durable
   mailbox addressing and marked-read state stay separate; sending never marks mail read.
9. Stand-down is reversible siesta; retirement is irreversible Agent death. A root Session's whole subtree settles before it is reaped — an open
   subsession means the record is still unaccounted for, and resource pressure never interrupts one. Reclamation targets replaceable resources only:
   identity, boards, transcripts, and story are never cleanup targets. Reprovisioning a non-retired Agent reuses the same Moorage row. Automation
   fails closed on dirty, unpushed, unauthenticated, or uncertain evidence; age may prioritize a resource already proven safe, but never proves
   safety.
10. Prove restart behavior by destroying and rebuilding the real persistence and Effect layers. A test that retains an in-memory service or mock has
    not crossed the recovery boundary it claims to exercise.
11. A record states its own completeness, and states it as a projection. Completeness is re-derived from the node's journaled gap ledger — an empty
    ledger is `complete`, any gap is `incomplete` — so a later repair reruns the same reading instead of arguing with what an earlier one concluded. A
    ledger that cannot be read is a refusal, never an empty one. Reopening a node returns it to `recording` whatever an earlier audit concluded, and
    `unaudited` is legacy backfill the audit refuses to touch.
