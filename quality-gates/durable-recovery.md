# Durable Recovery

Long-running work crosses process, provider, authentication, and machine
failures. This gate checks that disappearing execution machinery cannot rewrite
durable truth. The governing concepts are in
[`docs/design/agent-recovery.md`](../docs/design/agent-recovery.md).

## Rules

1. Persist everything that remains true after exit. Keep only fibers, handles,
   subscriptions, timers, wakes, workflow history, and rebuildable indexes in
   memory. If memory vanished after any effect, durable state must still tell
   the truth.
2. Restart every workflow attempt from durable intent and domain state. Steps
   reconcile idempotently; persisted execution checkpoints are forbidden.
3. Keep Agent identity, current replaceable resources, AgentSession provider
   conversation, work posture, and process attachment as separate concerns.
   Success or failure in one changes another only through an explicit domain
   transition.
4. Keep Piece demand separate from executable attempts. A dependency-blocked
   desired Piece has no dispatch Intent; waiting is only for an active attempt
   needing immediate external intervention. Reconciliation cancels a queued
   attempt that becomes blocked and submits a new one when demand is eligible.
5. Name success at the promised durable boundary. Durable domain transitions
   and the evidence they depend on are written atomically before success is
   reported. A transport send is never receipt or read evidence.
6. Absence is not a terminal event. An empty registry, closed process, dead
   watcher, or lost subscription never proves completion, closure, retirement,
   orphaning, or release.
7. Resume every assigned Agent, AgentSession, provider-native session or thread,
   native reference, and event sequence before spawning a replacement. Preserve
   M:N assignments and Session succession; never recover an arbitrary first row
   or replay the neutral event log as provider context. A successor is explicit
   recovery policy, never silent fallback.
8. Initial and recovery instructions use at-least-once transport: retry when
   provider acceptance is unknown and make duplicates harmless. Durable
   mailbox addressing and marked-read state stay separate; sending never marks
   mail read.
9. Stand-down is reversible siesta; retirement is irreversible Agent death.
   Reclamation targets replaceable resources only: identity, boards,
   transcripts, and story are never cleanup targets. Reprovisioning a
   non-retired Agent reuses the same Moorage row. Automation fails closed on
   dirty, unpushed, unauthenticated, or uncertain evidence; age may prioritize a
   resource already proven safe, but never proves safety.
10. Prove restart behavior by destroying and rebuilding the real persistence
    and Effect layers. A test that retains an in-memory service or mock has not
    crossed the recovery boundary it claims to exercise.
