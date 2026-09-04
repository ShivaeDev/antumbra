# Attention and memory

[Design guides](README.md) · [Glossary](../../GLOSSARY.md) · [Binding axioms](../../DESIGN.md)

Antumbra treats coordination and human attention as durable product concerns. Facts land before anyone is interrupted; delivery, prioritization, and
discussion are separate choices.

Human focus is scheduled through reified demands that can be queued, prioritized, and preempted. In v1 that schedule remains a pull projection: it can
order what deserves attention, but the admiral chooses the next item and persisting a fact never automatically selects work or resumes an Agent.

## Boards and registers

Durable entities such as Voyages, Pieces, repositories, and Agents carry a **Board**: one durable place where their memory and addressed signal live.
Boards do not duplicate state the database can derive.

Every Board has two salience registers, not two access levels:

- the **rough log** holds high-volume observations, working context, and half-formed notes worth leaving behind; and
- the **smooth log** holds distilled context a successor should receive without reconstructing the whole watch.

Entries are append-only and carry stable source identity. Replaying the same source is harmless. Boards, their entries, and the story they preserve
are never resource-reclamation targets.

## Smoothing

_Intended, not yet built._ Today a Board has both registers — agents write the rough one, the admiral may write either — and no pass appends a summary
or moves a frontier; see [intended](intended.md).

**Smoothing** advances what an ordinary reader sees first without rewriting history. A fresh-context pass appends an immutable summary with exact
source provenance, then conditionally advances the selected frontier. A concurrent writer makes that frontier update conflict rather than silently
losing either view.

Covered sources remain reachable. Smoothing may make derivable material recede from the frontier, but it never deletes the underlying graph. That is
how a Board can preserve evidence without making every old detail equally salient.

## Coordination rails

Antumbra coordinates through four settled rails: Board entries for shared state, ticks that request an idempotent pass, bounded direct messages for
addressed signal, and typed Artifact handoffs for durable results. Deterministic coordination belongs in software; Agents contribute the judgment that
cannot be reduced to a transition or query.

When context should survive a handoff, it belongs on the relevant Board rather than in an informal side conversation. A tick never carries the truth
it announces, and a direct message never replaces durable shared state. A tick nudges the scheduler, the demand pass, or the dispatcher; it is not a
Session wake, which puts one Session back on its provider and is only ever asked for.

## Attention lanes

_Intended, not yet built._ Only the decision point has a record today, and it is the Ruling; see [intended](intended.md).

Four lanes state why attention is wanted:

- **escalation** means work is blocked and always reaches the admiral;
- **decision point** requests a ruling; whether work continues is the request's declared urgency;
- **finding** records something outside the author's job for a relevant scope; and
- **grievance** records friction for aggregate review without demanding an answer.

An escalation also states its containment: hold the asker, hold the Voyage, or all stop. Anyone may pull all stop. The system makes it loud; social
correction comes afterwards rather than weakening the emergency rail.

## Rulings

A decision that needs an authority is a **Ruling**: its own typed record, not a Board entry, owned by the [rulings guide](rulings.md). What stays on
the Board is the small ask between agents, findings, and grievances. A ruling request always lands durably; whether it pages someone now is computed
from its declared urgency and radius and the admiral's standing posture for that scope, and the asker does not declare interruption.

## Heave to

_Intended, not yet built;_ see [intended](intended.md).

**Heave to** is focused discussion mode. The Agent settles its in-flight work, the conversation becomes its only traffic, and ordinary mail waits.
This keeps the Agent's context from moving on while the admiral is discussing the fork. Held mail flows afterwards, coalesced in precedence order.

Heaving to does not erase demand, park a Piece, or retire the Agent. Those are separate product acts with separate durable consequences.

## Mail and precedence

Mail is an immutable, Board-backed message addressed to an Agent. Its stable record and marked-read receipt are separate durable facts; reading does
not mean handling. Carrying mail into an execution context is separate from writing it: today the Agent reads its mailbox through one tool and marks
entries read through another, and nothing pushes mail into a running Session.

Mail carries a **precedence** — routine, priority, or flash — and today it is stored and shown, not acted on. The ordering it is meant to drive is
intended, not yet built: routine waits for a full idle boundary, priority jumps the routine queue at that boundary, and flash alone may steer into
running work, with routine and priority held during heave-to. What steers into running work today is the admiral's own send. In v1, the admiral
selects what an idle Agent receives: mail arrival and external observations never wake, resume, or interrupt an Agent on their own.
