# Attention and memory

[Design guides](README.md) · [Glossary](../../GLOSSARY.md) ·
[Binding axioms](../../DESIGN.md)

Antumbra treats coordination and human attention as durable product concerns.
Facts land before anyone is interrupted; delivery, prioritization, and
discussion are separate choices.

## Boards and registers

Durable entities such as Voyages, Pieces, repositories, and Agents carry a
**Board**: one durable place where their memory and addressed signal live.
Boards do not duplicate state the database can derive.

Every Board has two salience registers, not two access levels:

- the **rough log** holds high-volume observations, working context, and
  half-formed notes worth leaving behind; and
- the **smooth log** holds distilled context a successor should receive
  without reconstructing the whole watch.

Entries are append-only and carry stable source identity. Replaying the same
source is harmless. Boards, their entries, and the story they preserve are
never resource-reclamation targets.

## Smoothing

**Smoothing** advances what an ordinary reader sees first without rewriting
history. A fresh-context pass appends an immutable summary with exact source
provenance, then conditionally advances the selected frontier. A concurrent
writer makes that frontier update conflict rather than silently losing either
view.

Covered sources remain reachable. Smoothing may make derivable material recede
from the frontier, but it never deletes the underlying graph. That is how a
Board can preserve evidence without making every old detail equally salient.

## Attention lanes

Four lanes state why attention is wanted:

- **escalation** means work is blocked and always reaches the admiral;
- **decision point** asks for a ruling while work continues;
- **finding** records something outside the author's job for a relevant scope;
  and
- **grievance** records friction for aggregate review without demanding an
  answer.

An escalation also states its containment: hold the asker, hold the Voyage, or
all stop. Anyone may pull all stop. The system makes it loud; social correction
comes afterwards rather than weakening the emergency rail.

## Questions and rulings

A **Question** is a typed Board entry with stable identity on the scope where
the fork arose. Raises route that same Question through the authority ladder;
they may add an addressee, importance, context pointer, take, or severity
change without copying the Question into a new object. Rulings and withdrawals
that reference it derive whether it remains open.

Rulings are scoped, supersedable precedent appended to the Board where they
bind. Agents check that precedent before asking. A reversible, two-way-door
Question may expire and be re-raised for a provisional lower-level ruling. An
expensive-to-undo one-way-door Question never times out.

Reach and interruption are separate. The Question always lands durably.
Whether it pages someone now is computed from its importance and the admiral's
standing posture for that scope; the asker does not declare interruption.

## Heave to

**Heave to** is focused discussion mode. The Agent settles its in-flight work,
the conversation becomes its only traffic, and ordinary mail waits. This keeps
the Agent's context from moving on while the admiral is discussing the fork.
Held mail flows afterwards, coalesced in precedence order.

Heaving to does not erase demand, park a Piece, or retire the Agent. Those are
separate product acts with separate durable consequences.

## Mail and precedence

Mail is an immutable, Board-backed message addressed to an Agent. Its stable
record and marked-read receipt are separate durable facts; reading does not
mean handling, and transport into an execution context does not prove either.

**Precedence** orders delivery: routine waits for a full idle boundary,
priority jumps the routine queue at that boundary, and flash alone may steer
into running work. Routine and priority remain held during heave-to. In v1,
the admiral selects what an idle Agent receives: mail arrival and external
observations never wake, resume, or interrupt an Agent on their own.
