# Charters

[Design guides](README.md) · [Binding axioms](../../DESIGN.md)

A charter supplies the context and conduct an Agent needs for its responsibility. Tool descriptions own what an act does, its inputs, and its durable
boundary. This division follows DEC-0166, **Standing orders describe conduct, not tools**. The checklist below is for reviewing generated prompts
against behavior, not for adding every design axiom to a session.

## Every generated charter

These requirements apply to the flagship captain, a Voyage captain, and each crew member, whatever specialist role its Piece names.

| The Agent needs to know                                                                                                                                    | Why it belongs                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Read the rulings that bind the work with their questions and context before acting or asking again.                                                        | [A Ruling binds question and answer](rulings.md); a summary without the question can misstate what was decided.                                        |
| If a question is not theirs to settle, explain the situation, question, recommendation, reason, and work that needs the answer; continue unaffected work.  | DEC-0166's conduct requirement and [radius versus urgency](rulings.md); an unexplained ask cannot carry a decision across an attention gap.            |
| Leave reasoning, unresolved questions and the next useful step for someone who missed the conversation. Write the rough register and omit derivable state. | [Boards preserve coordination](attention-and-memory.md), DEC-0155 **Agents write the rough register**; shared memory needs a clear authoring boundary. |
| A session can stop at a safe boundary and later resume the same identity and responsibility. Recover current context before continuing.                    | [Recovery resumes before it replaces](agent-recovery.md); idleness and loss of execution do not end responsibility.                                    |
| The admiral's steering directs work already in hand.                                                                                                       | DEC-0157 **The admiral steers**; an active Agent must incorporate the direction instead of treating it as an unrelated future task.                    |
| Use supplied repository folders and branches; keep scratch in the Moorage and repository changes in a Berth.                                               | [Repository resources are app-level](agent-recovery.md#provisioning-and-resource-topology); the registry name and folder can differ.                   |

Tool inventories, parameter instructions and API lifecycle explanations never belong in generated standing orders. They duplicate the records the
Agent receives and give the same operational meaning two owners. Unactionable restatements of process architecture, admission machinery and storage
schemas add no decision the Agent can make. These exclusions follow DEC-0166 and the [simplicity gate](../../quality-gates/simplicity.md).

## Flagship captain

| Moment | Required context or conduct                                                                                                                                 | Trace                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Open   | The fleet's north star and context, the fleet Board, current Pieces and standing rulings.                                                                   | [The fleet sails on one flagship](flagship.md); its Voyage and Board already own this context.  |
| Open   | Be the admiral's point of contact across Voyages, keeping the ask and its consequences understandable; other captains remain accountable for their Voyages. | [Flagship responsibility](flagship.md); accountability remains with the captain of each Voyage. |
| Open   | Apply captain conduct below to the flagship's work, including completion and availability.                                                                  | The flagship is a Voyage with a captain, not a separate dispatcher.                             |
| Wake   | Re-read relevant fleet context, pending outcomes and rulings before resuming the existing responsibility.                                                   | Recovery preserves identity; old context does not establish today's completion.                 |
| Steer  | Incorporate the admiral's direction into the current ask and the context other captains need.                                                               | DEC-0157 and the fleet Board's role across attention gaps.                                      |
| Never  | An obligation to supervise every worker, continuously watch the fleet, or charter every Voyage; inventories of fleet acts.                                  | [Flagship remit](flagship.md), DEC-0166; availability does not require perpetual execution.     |

## Voyage captain

| Moment | Required context or conduct                                                                                                                                    | Trace                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open   | The Voyage's north star, surrounding context, Board, existing Pieces with dependencies and outcomes, and standing rulings.                                     | [Workers report; captains charter](work-and-planning.md); existing work and findings must inform the next charter.                                       |
| Open   | Charter bounded work with expected outcomes and real dependencies; read findings before deciding what follows. Revise the course when evidence changes it.     | [Polaris is fixed; the course is not](../../DESIGN.md#direction-and-work); the next charter must respond to evidence rather than merely repeat the plan. |
| Open   | Judge progress by landed and pending outcomes. Work for now is done when no further captain action or decision is needed, including while awaiting an outcome. | [Done is derived](work-and-planning.md); a worker's silence or the captain's idleness is not a Piece outcome.                                            |
| Wake   | Recover the current Voyage, findings, pending outcomes, Board and rulings before deciding the next action.                                                     | [Durable truth survives exit](agent-recovery.md); a launched chain is not a promise of completion.                                                       |
| Steer  | Reassess the work in hand in light of the admiral's direction, preserving the reasoning a successor needs.                                                     | DEC-0157 and [Boards preserve coordination](attention-and-memory.md).                                                                                    |
| Never  | Crew instructions to land a Piece outcome, a promise that launched work always finishes by itself, or a catalogue of chartering and reading acts.              | Captains need no Piece assignment; launched work can still need their judgment. DEC-0166 keeps tool semantics with the act.                              |

## Crew, hand by hand

Each crew member receives the context of its assigned Piece and Voyage. A specialist role describes the work that hand does; it does not change the
division of responsibility between crew and captain or the meaning of completion.

| Moment | Required context or conduct                                                                                                                                              | Trace                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Open   | The Voyage's north star and context, the assigned Piece's title, charter and expected outcome, both Boards and applicable standing rulings.                              | [Work is chartered, never shopped](work-and-planning.md); the Agent must identify the assigned work and its expected result. |
| Open   | Report findings, work performed and what remains. Reports serve Agents and Artifacts serve the admiral; propose further work for the captain to charter.                 | [Outcomes are typed and audience-split](changes-and-delivery.md) and **Workers report; captains charter**.                   |
| Open   | Completion is derived from landed and pending outcomes; an open Change remains pending. Once assigned work and outcomes are landed, await further address or assignment. | [Landing is a durable boundary](changes-and-delivery.md); finishing a reply cannot substitute for landing a Change.          |
| Wake   | Recover the assigned work, Board notes and rulings, and check outcome state before continuing or claiming completion.                                                    | [Recovery resumes before it replaces](agent-recovery.md); a returning worker retains its responsibility.                     |
| Steer  | Incorporate the admiral's direction into that work and make remaining questions explicit.                                                                                | DEC-0157 and DEC-0166.                                                                                                       |
| Never  | Instructions to charter more Pieces, assume an open Change has landed, or rebuild the fleet's plan; lists of landing, reading or Board tools.                            | The crew/captain division keeps responsibility bounded; DEC-0166 keeps tool semantics with the act.                          |

## Manually supplied charters

A caller may supply a standalone charter without assigning the Agent to a Piece or Voyage. The caller owns that charter's task, relevant context,
expected result and applicable standing conduct. A standalone Agent has its own Board; its charter must not imply a Piece or Voyage assignment that it
does not have. This keeps responsibility explicit without making every conversation a unit of planned work.

The same continuity principles apply: on wake, recover the current task, own Board and binding rulings; on steer, incorporate the admiral's direction.
[Charter delivery](../../packages/domain/src/charter.ts) preserves the caller's words and supplies the available Berths. Caller-owned context remains
the caller's responsibility rather than being inferred from a role name.

## Context and delivery

A new captain or crew charter draws from the current durable record: work, Board notes and standing rulings. Its role determines which context the
Agent needs to act; the available Berths locate its repository work. Context assembly belongs with the domain so the same responsibility has the same
meaning across backends.

A wake resumes the existing responsibility and directs the Agent to recover current context before acting. It does not replay an old plan as if
nothing had changed. The admiral's words reach the Agent verbatim, with standing conduct explaining how to incorporate steering into work already in
hand. This preserves both continuity and the admiral's direction without repeating the whole charter on every message.

Review a charter for context, responsibility, binding decisions, successor conduct, continuity and a truthful stopping point. Review each tool record
for its operational meaning: Board writing identifies the rough register, Change acts distinguish preparation from landing, stand-down distinguishes
idleness from completion, and ruling acts state the authority that may exercise them. These meanings belong with the acts because an Agent needs them
whenever it uses the capability, regardless of how its charter was supplied.

## Compaction

A charter's conduct must remain available when a backend compacts its conversation. Compaction changes the Agent's working context, not its identity,
responsibility or the rulings that bind it. DEC-0166 therefore calls for re-delivering a concise charter digest after compaction.

The digest should carry current role context and conduct. Domain context assembly owns its meaning; the backend owns delivery. This keeps the Agent's
responsibility independent of how a provider manages its conversation.

The unresolved boundary is when the digest must become available relative to the Agent's next action. A compaction-completed notification alone does
not establish that ordering. Charter re-delivery remains intended behavior.
