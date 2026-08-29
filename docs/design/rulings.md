# Rulings

[Design guides](README.md) · [Glossary](../../GLOSSARY.md) ·
[Binding axioms](../../DESIGN.md)

A **Ruling** is how a decision and the context behind it are handed to
agents, and how an agent pulls a decision out of the authority above it. It
is its own record with its own lifecycle, beside the Board rather than inside
it: the Board is the free-form log of what happened and the small asks agents
leave one another; a Ruling is typed, scoped, and read long after the work
that asked for it. Antumbra is meant to be steered by rulings rather than by
conversation, so this record is the first thing that has to be right.

An agent **requests a ruling**; a captain or the admiral **rules on** it.

## The Ruling record

One record binds three parts that never come apart:

- the **context** — the situation, why the asker is asking, and how the work
  arrived here. The asker supplies it; over time the system supplies more of
  it. The wider a ruling will apply, the richer its context must be;
- the **question** — in whatever shape fits: yes or no, choose one, rank, or
  free prose. The asker may offer choices, from "go with my recommendation or
  redirect me" to a short list, but never has to. Whoever answers can always
  answer in free text beside any choice; and
- the **answer** — who ruled, when, and what.

A ruling is read in the light of its question. A broad-sounding answer to a
narrow question binds narrowly. That is why the three parts are one record:
an answer separated from its question loses its meaning.

Every ruling begins as a request. An authority that wants a standing rule
requests and answers a ruling of its own, so that context is never missing.
Whether a question and its answer ever become separable records is
deliberately undecided.

## Radius and urgency

A request declares two axes, and the two answer different questions.

| Axis | Values | Asks | Decides |
| --- | --- | --- | --- |
| **Radius** | `piece` · `voyage` · `fleet` | How widely will the answer apply once ruled? | Which authority level may answer. Above that level a captain may only add context. |
| **Urgency** | `blocking` · `pressing` · `eventual` | How badly does the asker need the answer before continuing? | Whether the asker holds or keeps working. |

`blocking` means the asker holds until ruled. `pressing` means the asker
continues, and the Pieces the ruling gates wait for it. `eventual` means
nothing waits; the decision is wanted someday. The two are independent: a
ruling with the smallest radius may still block one agent from starting at
all, and a fleet-wide ruling may be needed only several changes from now.

The asker declares both. Each captain the request passes may reclassify
either axis; a reclassification appends beside the asker's declaration and
never overwrites it.

## Subjects

Scope is typed as **subject plus radius**. A subject is zero or more typed
references — a registered repository, a Voyage, a Piece, an Agent — plus
free tags for concepts that have no row of their own. Reading precedent
matches references exactly and tags by name. A reference to something that
does not exist is refused when the ruling is written; scope is never left as
prose alone.

## The authority ladder

A request climbs. Its voyage captain sees it first, then the
[flagship captain](flagship.md#on-the-ladder), then the admiral. Each may rule
within its radius, add context the asker did not have, or reclassify radius
and urgency before passing it up.
The admiral may overrule any ruling below by superseding it; a captain's
rulings form an audit trail the admiral can read.

A request waits on one rung at a time, and the rung is read off the asker's
station rather than off the question: a crew member's request waits on its
voyage's captain, a captain's on the flagship captain, the flagship captain's
on the admiral. An authority that proclaims a rule of its own waits on nobody.
The rung that holds a request either answers it — within its radius — or
passes it up one step with a note, which is how context accumulates on the way.
A verdict from below the rung a request waits on is refused: a question that
climbed past a captain is no longer that captain's to settle. Radius decides
reach separately: a voyage captain answers at `piece` and `voyage`, the
flagship at any radius, and the admiral over all of it. Every verdict and every
reclassification an agent gives records which agent gave it beside the rung it
spoke for, because one captain among many is not named by its rung alone.

## Rulings gate Pieces

A Ruling is a node in the Piece graph. A request may name the Pieces that
cannot start until it is ruled; those Pieces depend on the open ruling the
way they depend on Pieces. Blocked by an open ruling is derived, readiness
returns when the ruling lands, and the admiral sees exactly what each ruling
unblocks.

A Ruling is not an Outcome and is owned by no Piece or Voyage. A Piece may
exist only to surface rulings for later Pieces, and a ruling outlives the
work that asked for it. Rulings link to the Pieces they gate, many to many,
independent of what the requesting Piece lands.

## Standing rulings and smoothing

A ruling **stands** once ruled and until it is superseded. The standing set
of a scope needs smoothing as a Board does: rulings get superseded, stop
mattering, could be combined into one broader rule, or lose the question
that gave them meaning. Smoothing a scope's rulings means reclassifying,
pushing a ruling upward where it turns out to apply more widely,
consolidating, and retiring — always by appending with provenance, with
every source still reachable. Dedicated agents do that work; a captain's
context is not spent on it.

## Reach

Standing rulings reach an agent as part of what it is told when its context
opens and through tools that read precedent and request rulings. Agents read
what binds them before they ask.

The answer to an agent's own request arrives the way every other update
does: through mail when it is convenient, or, when the asker declared the
request `blocking`, as the tool call that does not return until the ruling
lands. Rulings ride the ordinary delivery rails and get none of their own.

Two failures are what this exists to end: a blocking ask that freezes a
captain from managing its Voyage and buries it under queued reports on
return, and a non-blocking ask after which the agent invents busy work or
gambles on one fork. Agents should progress on everything that does not need
the ruling and stop on what does.
