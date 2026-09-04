# Rulings

[Design guides](README.md) · [Glossary](../../GLOSSARY.md) · [Binding axioms](../../DESIGN.md)

A **Ruling** is how a decision and the context behind it are handed to agents, and how an agent pulls a decision out of the authority above it. It is
its own record with its own lifecycle, beside the Board rather than inside it: the Board is the free-form log of what happened and the small asks
agents leave one another; a Ruling is typed, scoped, and read long after the work that asked for it. Antumbra is meant to be steered by rulings rather
than by conversation, so this record is the first thing that has to be right.

An agent **requests a ruling**; a captain or the admiral **rules on** it.

## The Ruling record

One record binds three parts that never come apart:

- the **context** — the situation, why the asker is asking, and how the work arrived here. The asker supplies it; over time the system supplies more
  of it. The wider a ruling will apply, the richer its context must be;
- the **question** — in whatever shape fits: yes or no, choose one, rank, or free prose. The asker may offer choices, from "go with my recommendation
  or redirect me" to a short list, but never has to. Whoever answers can always answer in free text beside any choice; and
- the **answer** — who ruled, when, and what.

A ruling is read in the light of its question. A broad-sounding answer to a narrow question binds narrowly. That is why the three parts are one
record: an answer separated from its question loses its meaning.

Every ruling begins as a request. An authority that wants a standing rule requests and answers a ruling of its own, so that context is never missing.
Whether a question and its answer ever become separable records is deliberately undecided.

## Radius and urgency

A request declares two axes, and the two answer different questions.

<!-- prettier-ignore -->
| Axis | Values | Asks | Decides |
| --- | --- | --- | --- |
| **Radius** | `piece` · `voyage` · `fleet` | How widely will the answer apply once ruled? | Which authority level may answer. Above that level a captain may only add context. |
| **Urgency** | `blocking` · `pressing` · `eventual` | How badly does the asker need the answer before continuing? | Whether the asker holds or keeps working. |

`blocking` means the asker holds until ruled. `pressing` means the asker continues, and the Pieces the ruling gates wait for it. `eventual` means
nothing waits; the decision is wanted someday. The two are independent: a ruling with the smallest radius may still block one agent from starting at
all, and a fleet-wide ruling may be needed only several changes from now.

The asker declares both. Each captain the request passes may reclassify either axis; a reclassification appends beside the asker's declaration and
never overwrites it.

## Subjects

Scope is typed as **subject plus radius**. A subject is zero or more typed references — a registered repository, a Voyage, a Piece, an Agent — plus
free tags for concepts that have no row of their own. Reading precedent matches references exactly and tags by name. A reference to something that
does not exist is refused when the ruling is written; scope is never left as prose alone.

## The authority ladder

A request climbs. Its voyage captain sees it first, then the [flagship captain](flagship.md#on-the-ladder), then the admiral. Each may rule within its
radius, add context the asker did not have, or reclassify radius and urgency before passing it up. The admiral may overrule any ruling below by
superseding it; a captain's rulings form an audit trail the admiral can read.

A request waits on one rung at a time, and the rung is read off the asker's station rather than off the question: a crew member's request waits on its
voyage's captain, a captain's on the flagship captain, the flagship captain's on the admiral. An authority that proclaims a rule of its own waits on
nobody. The rung that holds a request either answers it — within its radius — or passes it up one step with a note, which is how context accumulates
on the way. A verdict from below the rung a request waits on is refused: a question that climbed past a captain is no longer that captain's to settle.
Radius decides reach separately: a voyage captain answers at `piece` and `voyage`, the flagship at any radius, and the admiral over all of it. Every
verdict and every reclassification an agent gives records which agent gave it beside the rung it spoke for, because one captain among many is not
named by its rung alone.

## Rulings gate Pieces

A Ruling is a node in the Piece graph. A request may name the Pieces that cannot start until it is ruled; those Pieces depend on the open ruling the
way they depend on Pieces. Blocked by an open ruling is derived, readiness returns when the ruling lands, and the admiral sees exactly what each
ruling unblocks.

A Ruling is not an Outcome and is owned by no Piece or Voyage. A Piece may exist only to surface rulings for later Pieces, and a ruling outlives the
work that asked for it. Rulings link to the Pieces they gate, many to many, independent of what the requesting Piece lands.

## Approval

A plot is approved before its Pieces sail, and again whenever it changes beyond what was approved. The approval is a Ruling of kind `approval` rather
than a flag: it records the Piece set it approved, so a later plot can be compared against it and the approval can be superseded like any other
ruling. Every other Ruling is of kind `ruling`; the kind is declared on the record and defaults to it.

A captain **requests approval** for its voyage, and the flagship captain for the flagship's own. The captain supplies the plot — why these Pieces, in
this shape, now — and nothing else: the Piece set is computed at the moment of asking as every Piece on the voyage neither abandoned nor parked, so
parking is how a captain shapes what it asks for. The request is a `voyage`-radius, `pressing` ruling naming the voyage and the captain, and it waits
on the admiral alone; no captain, the flagship included, may rule on it. Its two choices, `approve` and `redirect`, are written by the system. The
request is refused when the set is empty, when an earlier request on the voyage is still unanswered, and when the set is exactly what already stands
approved.

The admiral answers with one of the two choices and words beside it. `approve` makes the request the voyage's **standing approval** and supersedes the
one before it in the same act, so exactly one approved set stands per voyage. `redirect` rules the request without changing the approved set; the
admiral's words stand as any ruling does, and the captain re-plots and asks again. The voyage view shows the standing approved set and the open
request, if there is one, to the admiral, the captain and the crew alike.

## Standing rulings and smoothing

_The dedicated smoothing agents are intended, not yet built._ Superseding, withdrawing, and reclassifying exist as acts; see [intended](intended.md).

A ruling **stands** once ruled and until it is retired. The standing set of a scope needs smoothing as a Board does: rulings get superseded, stop
mattering, could be combined into one broader rule, or lose the question that gave them meaning. Smoothing a scope's rulings means reclassifying,
pushing a ruling upward where it turns out to apply more widely, consolidating, and retiring — always by appending with provenance, with every source
still reachable. Dedicated agents do that work; a captain's context is not spent on it.

Retiring has two shapes. A ruling is **superseded** when a later ruling takes over its scope, and **withdrawn** when an authority retires it with no
successor — the question stopped mattering rather than getting a different answer. A withdrawal appends who withdrew it, when, and a note saying why;
the note stands where the successor would have, so nobody later meets a rule that stopped applying for no stated reason. Both leave the standing set,
neither edits the record, and both stay reachable by id.

A standing ruling is **stale** when it names at least one Piece or Voyage and every one of them has concluded. Staleness is derived from the state of
that work rather than stored on the ruling, and it is surfaced rather than acted on: a stale ruling binds every agent it names until an authority
withdraws it. Tags, repositories and Agents outlive any amount of work, so they neither age a ruling nor keep it fresh.

## Reach

Standing rulings reach an agent as part of what it is told when its context opens and through tools that read precedent and request rulings. Agents
read what binds them before they ask.

The answer to an agent's own request arrives the way every other update does: through mail when it is convenient, or, when the asker declared the
request `blocking`, as the tool call that does not return until the ruling lands. Rulings ride the ordinary delivery rails and get none of their own.

Two failures are what this exists to end: a blocking ask that freezes a captain from managing its Voyage and buries it under queued reports on return,
and a non-blocking ask after which the agent invents busy work or gambles on one fork. Agents should progress on everything that does not need the
ruling and stop on what does.
