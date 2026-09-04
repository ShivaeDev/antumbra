# Charters

[Design guides](README.md) · [Binding axioms](../../DESIGN.md)

A charter supplies the context and conduct an Agent needs for its responsibility. Tool descriptions own what an act does, its inputs, and its durable
boundary. This division follows DEC-0166, **Standing orders describe conduct, not tools**. The checklist below is for reviewing generated prompts
against behavior, not for adding every design axiom to a session.

## Every generated charter

These requirements apply to the flagship captain, a Voyage captain, and each crew member, whatever specialist role its Piece names.

| The Agent needs to know                                                                                                                                    | Why it belongs                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Read the rulings that bind the work with their questions and context before acting or asking again.                                                        | [A Ruling binds question and answer](rulings.md); the old summaries alone could be mistaken for the whole decision.                          |
| If a question is not theirs to settle, explain the situation, question, recommendation, reason, and work that needs the answer; continue unaffected work.  | DEC-0166's conduct requirement and [radius versus urgency](rulings.md); an unexplained ask cannot carry a decision across an attention gap.  |
| Leave reasoning, unresolved questions and the next useful step for someone who missed the conversation. Write the rough register and omit derivable state. | [Boards preserve coordination](attention-and-memory.md), DEC-0155 **Agents write the rough register**; old orders did not name the register. |
| A session can stop at a safe boundary and later resume the same identity and responsibility. Recover current context before continuing.                    | [Recovery resumes before it replaces](agent-recovery.md); the old crew order incorrectly described standing down as detaching execution.     |
| The admiral's steering directs work already in hand.                                                                                                       | DEC-0157 **The admiral steers**; an active Agent must incorporate the direction instead of treating it as an unrelated future task.          |
| Use supplied repository folders and branches; keep scratch in the Moorage and repository changes in a Berth.                                               | [Repository resources are app-level](agent-recovery.md#provisioning-and-resource-topology); the registry name and folder can differ.         |

Tool inventories, parameter instructions and API lifecycle explanations never belong in generated standing orders. They duplicate the records the
Agent receives and can drift, as the old crew stand-down text did. Unactionable restatements of process architecture, admission machinery and storage
schemas add no decision the Agent can make. These exclusions follow DEC-0166 and the [simplicity gate](../../quality-gates/simplicity.md).

## Flagship captain

| Moment | Required context or conduct                                                                                                                                 | Trace                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Open   | The fleet's north star and context, the fleet Board, current Pieces and standing rulings.                                                                   | [The fleet sails on one flagship](flagship.md); its Voyage and Board already own this context.     |
| Open   | Be the admiral's point of contact across Voyages, keeping the ask and its consequences understandable; other captains remain accountable for their Voyages. | [Flagship responsibility](flagship.md); the former fleet tool catalogue obscured this distinction. |
| Open   | Apply captain conduct below to the flagship's work, including completion and availability.                                                                  | The flagship is a Voyage with a captain, not a separate dispatcher.                                |
| Wake   | Re-read relevant fleet context, pending outcomes and rulings before resuming the existing responsibility.                                                   | Recovery preserves identity; old context does not establish today's completion.                    |
| Steer  | Incorporate the admiral's direction into the current ask and the context other captains need.                                                               | DEC-0157 and the fleet Board's role across attention gaps.                                         |
| Never  | An obligation to supervise every worker, continuously watch the fleet, or charter every Voyage; inventories of fleet acts.                                  | [Flagship remit](flagship.md), DEC-0166; availability does not require perpetual execution.        |

## Voyage captain

| Moment | Required context or conduct                                                                                                                                    | Trace                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Open   | The Voyage's north star, surrounding context, Board, existing Pieces with dependencies and outcomes, and standing rulings.                                     | [Workers report; captains charter](work-and-planning.md); existing work and findings must inform the next charter.                              |
| Open   | Charter bounded work with expected outcomes and real dependencies; read findings before deciding what follows. Revise the course when evidence changes it.     | [Polaris is fixed; the course is not](../../DESIGN.md#direction-and-work); tool availability alone did not teach this judgment.                 |
| Open   | Judge progress by landed and pending outcomes. Work for now is done when no further captain action or decision is needed, including while awaiting an outcome. | [Done is derived](work-and-planning.md); a worker's silence or the captain's idleness is not a Piece outcome.                                   |
| Wake   | Recover the current Voyage, findings, pending outcomes, Board and rulings before deciding the next action.                                                     | [Durable truth survives exit](agent-recovery.md); a launched chain is not a promise of completion.                                              |
| Steer  | Reassess the work in hand in light of the admiral's direction, preserving the reasoning a successor needs.                                                     | DEC-0157 and [Boards preserve coordination](attention-and-memory.md).                                                                           |
| Never  | Crew instructions to land a Piece outcome, a promise that launched work always finishes by itself, or a catalogue of chartering and reading acts.              | Captains need no Piece assignment; the old order promised an autonomous finish that failures can prevent. DEC-0166 removes duplicate tool text. |

## Crew, hand by hand

`hand` is used as a crew role in the current fixtures; it is not a fourth authority or a different completion model. A Piece supplies its specialist
role and task. [Crew charter assembly](../../packages/domain/src/crew-charter.ts) gives every assigned crew member the same responsibility-specific
context, including a Piece whose role happens to be `hand`.

| Moment | Required context or conduct                                                                                                                                              | Trace                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Open   | The Voyage's north star and context, the assigned Piece's title, charter and expected outcome, both Boards and applicable standing rulings.                              | [Work is chartered, never shopped](work-and-planning.md); the Agent must identify the assigned work and its expected result. |
| Open   | Report findings, work performed and what remains. Reports serve Agents and Artifacts serve the admiral; propose further work for the captain to charter.                 | [Outcomes are typed and audience-split](changes-and-delivery.md) and **Workers report; captains charter**.                   |
| Open   | Completion is derived from landed and pending outcomes; an open Change remains pending. Once assigned work and outcomes are landed, await further address or assignment. | [Landing is a durable boundary](changes-and-delivery.md); finishing a reply cannot substitute for landing a Change.          |
| Wake   | Recover the assigned work, Board notes and rulings, and check outcome state before continuing or claiming completion.                                                    | [Recovery resumes before it replaces](agent-recovery.md); a returning worker retains its responsibility.                     |
| Steer  | Incorporate the admiral's direction into that work and make remaining questions explicit.                                                                                | DEC-0157 and DEC-0166.                                                                                                       |
| Never  | Instructions to charter more Pieces, assume an open Change has landed, or rebuild the fleet's plan; lists of landing, reading or Board tools.                            | The crew/captain division and DEC-0166; the old charter spent most of its standing orders repeating tool records.            |

## Manually supplied charters

The low-level [spawn payload](../../packages/domain/src/spawn-fields.ts) also accepts a caller-written charter without a Piece or Voyage. That path is
not a fourth generated role: [delivery](../../packages/domain/src/charter.ts) adds available Berths and otherwise preserves the supplied text. It does
not currently assemble Board context, standing rulings or these role orders for the caller. This is a delivery gap, not a claim that such sessions
already receive a generated hand charter.

For a manual session, the caller's charter must state the actual task and what counts as answering it, plus the common conduct above where applicable
(DEC-0166). On wake it must recover its current task, own Board and binding rulings; on steer it must incorporate the admiral's direction (DEC-0157).
It must never claim a Piece or Voyage assignment the spawn does not have: current [tool tests](../../packages/testing/test/tools.test.ts) prove a
standalone session has its own Board but no Voyage Board or Piece against which to land. Adding generated context to this path needs its own delivery
decision; this change preserves the caller-written charter contract.

## Delivery and review

[Captain hail](../../packages/domain/src/hail.ts) and [crew assembly](../../packages/domain/src/crew-charter.ts) read the current record when creating
a charter. [Kind selection](../../packages/domain/src/charter-flagship.ts) selects flagship or captain wording. The shared
[delivery boundary](../../packages/domain/src/charter.ts) appends the provisioned Berths, queues the charter and stamps `charterDeliveredAt`.

[Wake](../../packages/sessions/src/wake/wake.ts) resumes the existing session. A wake carrying words delivers those words; an ordinary wake of an idle
or detached session uses the short [wake instruction](../../packages/prompts/src/wake.ts) to recover current context. A hail of an already active
session does not inject generic work. [Admiral text](../../packages/prompts/src/admiral.ts) stays verbatim; initial standing orders explain how to
incorporate steering. These paths do not regenerate the whole charter on every message.

Review the rendered charter for context, responsibility, binding decisions, successor conduct, continuity and a truthful stopping point. Review the
tool record separately for operational semantics. In particular:

- [Board writing](../../packages/agent-tools/src/boards.ts) names the rough register, successor audience and exclusion of derivable state.
- [Change descriptions](../../packages/agent-tools/src/changes.ts) distinguish opening, submission and adoption from landing, and locate the exact
  registry spelling under Berths rather than repeating those parameters in standing orders.
- [Stand-down](../../packages/agent-tools/src/crew.ts) describes idleness and continued reachability, not detachment, retirement or Piece completion.
- [Ruling verdicts](../../packages/agent-tools/src/ruling-verdicts.ts) state the current captain and flagship radius limits and when to pass a
  question upward; removing the old charter inventory does not remove this meaning.

Prompt tests check these meanings and the absence of generated tool inventories. Existing domain delivery tests check that actual Board, ruling, Berth
and wake inputs reach the provider. They do not snapshot the full prose or claim a model will always follow it.

## Compaction

Research only, checked 2026-09-04. Neither backend declares a provider SDK dependency in its package manifest, and corresponding installed SDK types
under `node_modules` were **not found**. Codex protocol evidence is checked into the repository; OpenCode evidence below distinguishes supplemental
upstream types from the unverified external executable. No provider was launched.

Codex's declared CLI pin is `0.148.0-alpha.9` in [protocol.ts](../../packages/backend-codex/src/protocol.ts).
[ServerNotification.json](../../packages/backend-codex/src/schema/ServerNotification.json) defines `ThreadItem`'s `ContextCompactionThreadItem`
variant with `type: "contextCompaction"` and `id`. `ItemCompletedNotification` carries that item with `threadId`, `turnId` and `completedAtMs`;
`ItemStartedNotification` carries the corresponding start. `ContextCompactedNotification` and `thread/compacted` remain but are explicitly deprecated
in favor of the item. The [official app-server documentation](https://learn.chatgpt.com/docs/app-server) also describes the compaction item lifecycle.
The completed item is a prospective completion signal; reasoning summary deltas are not. The
[handshake](../../packages/backend-codex/src/handshake.ts) warns on a differing runtime version, so the declared pin does not establish the executable
version actually used in a session.

OpenCode's [official SDK documentation](https://opencode.ai/docs/sdk/) links to the upstream
[generated event types](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts). `EventSessionCompacted` has
`type: "session.compacted"` and `properties: { sessionID: string }`; `Event` includes it and `GlobalEvent` wraps it with `directory` and `payload`.
The [official plugin event list](https://opencode.ai/docs/plugins/#session-events) names `session.compacted` too. These are upstream sources, not an
installed or pinned Antumbra SDK version. The [plugin](../../packages/backend-opencode/src/plugin.ts) discovers an external executable on the login
PATH without a version pin. Its exact version, corresponding installed event types and runtime emission were **not found or verified**.

Both signals currently remain raw evidence. Codex [mapping](../../packages/backend-codex/src/mapping.ts) passes item notifications to
[items](../../packages/backend-codex/src/items.ts), whose known variants exclude compaction; the legacy notification takes the mapping default.
OpenCode [session filtering](../../packages/backend-opencode/src/session-frames.ts) accepts a matching `sessionID`, and
[projection](../../packages/backend-opencode/src/projection.ts) emits an unrecognized compaction event as raw. The
[neutral event vocabulary](../../packages/vocabulary/src/session-events/events.ts) has no compaction variant, and
[session attachment](../../packages/session-fabric/src/session-attachment.ts) has no compaction handler. Initial charter delivery's stamp is not a
re-delivery mechanism.

Re-delivery would need each backend to decode its verified completion shape into one neutral event while preserving raw evidence. Codex would need to
treat its item and legacy notification as alternative observations of a compaction. The session path would then need to associate the event with the
durable Agent, obtain a current role-appropriate digest above the adapters, and record and deliver it through the existing input boundary.
[SessionHandle](../../packages/plugin-api/src/backend.ts) has `steer` and `queue`, while
[fabric send](../../packages/session-fabric/src/session-attachment-registry.ts) currently selects `steer`. Neither the
[Codex turn queue](../../packages/backend-codex/src/turns.ts) nor the [OpenCode turn queue](../../packages/backend-opencode/src/turns.ts) establishes
a barrier before the first model call after compaction; each waits for its provider's completion or idle boundary. That ordering guarantee needs an
explicit decision and provider verification. Resetting the initial-delivery stamp is not a substitute for a re-delivery record.

Neither notification shape says which charter sentences the model retained. Total loss of standing orders after compaction was not established by
these types; exact retention and delivery before continuation remain unverified. No compaction behavior is implemented here.
