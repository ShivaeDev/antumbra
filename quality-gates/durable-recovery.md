# Durable Recovery

Long-running work outlives the process that ran it. This gate checks that disappearing execution machinery cannot rewrite durable truth, and that
recovery stays the small set of acts that exist. The governing concepts are in [`docs/design/agent-recovery.md`](../docs/design/agent-recovery.md);
the [simplicity gate](simplicity.md) is the precedent, so no retry, startup healing, race handling, simulated crash, or transaction ships without a
product ruling.

## What recovery is

Recovery is exactly this: persistence writes a `VACUUM INTO` backup before migrations run and keeps the five newest; a graceful quit marks attached
roots draining, cuts their turns, and settles them to idle; a restart the admiral asks for records the attached roots in an `AppMeta` row and the next
boot deletes the row and wakes exactly those roots; the dev loop relaunches Electron on exit code 75. Nothing else resumes a Session, and nothing
retries on its own. A change that adds to this list needs a product ruling first.

## Rules

1. Persist everything that remains true after exit. Keep only fibers, handles, subscriptions, timers, wakes, workflow history, and rebuildable indexes
   in memory. If memory vanished after any effect, durable state must still tell the truth.
2. Restart every workflow attempt from durable intent and domain state. Steps reconcile idempotently; persisted execution checkpoints are forbidden.
   Boot reclaims Intents that were running when the process went — requeued or abandoned by kind — and repairs Session rows: an unattached drain
   settles to idle, an open root whose Agent is gone closes, and an Agent's pointer is healed to its one open root. Boot opens no provider
   conversation.
3. Keep Agent identity, current replaceable resources, AgentSession provider conversation, Piece demand, and process attachment as separate concerns.
   Success or failure in one changes another only through an explicit domain transition. A dependency-blocked desired Piece has no dispatch Intent;
   waiting is only for an admitted attempt that needs external intervention, and it waits until somebody retries it.
4. Name success at the promised durable boundary. Write the required durable transition and its evidence before reporting success. A transport send is
   never receipt or read evidence: an input is marked accepted only after provider handoff, a failure after handoff marks it ambiguous, and an
   ambiguous input waits for the admiral rather than being resent. Durable mailbox addressing and marked-read state stay separate; sending never marks
   mail read.
5. Absence is not a terminal event. An empty registry, closed process, dead watcher, or lost subscription never proves completion, closure,
   retirement, orphaning, or release. Provable death is the one carve-out, and it is a predicate rather than a silence: the boot reconciler may close
   a subsession node with outcome `unknown` only when the root row it hangs from is itself closed and the owning Agent is gone — missing, not alive,
   or pointing at a different current Session. Anything undecidable leaves the node open, including a root that cannot be read and an Agent status
   that cannot be decoded. The record then says it never found out; it never says the work finished.
6. Resume before replacing. The root Session is the resumable unit: a subsession belongs to its root's record, is never addressed on its own, and is
   never a resume, drain, or stop target. A wake restores the same Agent, root Session, and provider-native conversation, and never replays the
   neutral event log as provider context. A successor is explicit recovery policy, never silent fallback. At most one root Session per Agent is open
   at a time, and a violation heals by rule rather than by choice: keep the Session the Agent points at when it is a valid open root, otherwise the
   newest by `createdAt` with the larger id breaking a tie, and close the rest. A child is refused an attachment at two seams — the domain refuses a
   Session id that is not a root, and the backend refuses a provider thread it knows to be a node.
7. Stand-down is reversible siesta; retirement is irreversible Agent death. A root Session's whole subtree settles before it is reaped — an open
   subsession means the record is still unaccounted for, and resource pressure never interrupts one. Reclamation targets replaceable resources only:
   identity, boards, transcripts, and story are never cleanup targets. Reprovisioning a non-retired Agent reuses the same Moorage row. Automation
   fails closed on dirty, unpushed, unauthenticated, or uncertain evidence; age may prioritize a resource already proven safe, but never proves
   safety.
8. A record states its own completeness, and states it as a projection. Completeness is re-derived from the node's journaled gap ledger — an empty
   ledger is `complete`, any gap is `incomplete` — so a later repair reruns the same reading instead of arguing with what an earlier one concluded. A
   ledger that cannot be read is a refusal, never an empty one. Reopening a node returns it to `recording` whatever an earlier audit concluded, and
   `unaudited` is legacy backfill the audit refuses to touch.
9. Tests prove these acts through their local cause and visible result — the row a restart writes, the wake a boot submits, the status a drain settles
   — and never simulate a crash to exercise a recovery path.
