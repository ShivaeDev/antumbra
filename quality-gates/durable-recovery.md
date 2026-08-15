# Durable Recovery

Long-running work crosses process, provider, authentication, and machine
failures. This gate checks that disappearing execution machinery cannot rewrite
durable truth. The governing concepts are in
[`docs/design/agent-recovery.md`](../docs/design/agent-recovery.md).

## Rules

1. Persist everything that remains true after exit. Keep only fibers, handles,
   subscriptions, timers, wakes, workflow history, and rebuildable indexes in
   memory.
2. Restart every workflow attempt from durable intent and domain state. Steps
   reconcile idempotently; persisted execution checkpoints are forbidden.
3. Keep Agent identity, current replaceable resources, and AgentSession
   provider conversation as separate concerns. Success or failure in one may
   only change the others through an explicit domain transition.
4. Name success at the promised durable boundary. Durable domain transitions
   and the evidence they depend on are written atomically before success is
   reported. A transport send is never receipt or read evidence.
5. Absence is not a terminal event. An empty registry, closed process, dead
   watcher, or lost subscription never proves completion, closure, retirement,
   orphaning, or release.
6. Resume the same Agent, AgentSession, and provider-native session or thread.
   A successor is explicit recovery policy, never silent fallback, and the
   neutral event log is not provider replay input.
7. Choose delivery semantics explicitly. Recovery instructions use
   at-least-once transport: retry when provider acceptance is unknown and make
   duplicates harmless. Durable mailbox addressing and marked-read state stay
   separate; sending never marks mail read.
8. Reclamation targets replaceable resources only and fails closed on dirty,
   unpushed, unauthenticated, or uncertain evidence. Age is a policy signal,
   not proof of safety.

## Review checklist

- [ ] If all process memory disappeared after any effect, would the database
      still describe the truth?
- [ ] Does a retried attempt reconcile from scratch without duplicating an
      already-completed step?
- [ ] Are identity, resource readiness, provider establishment, work posture,
      and process attachment distinct rather than collapsed into one status?
- [ ] Is success backed by durable evidence at the same boundary as the state
      transition it justifies?
- [ ] Can observer death or an empty in-memory collection accidentally settle
      domain work or release a resource?
- [ ] Does normal recovery preserve Agent, AgentSession, native reference, and
      event sequence rather than replaying or replacing them?
- [ ] Does each delivery path distinguish durable addressed and marked-read
      truth from at-least-once transport, with duplicate-tolerant instructions?
- [ ] Does cleanup preserve identity, boards, transcript, and story, and block
      automation whenever safety evidence is incomplete?
- [ ] Does a restart test destroy and rebuild the real persistence and Effect
      layers rather than retaining an in-memory service or mock?
