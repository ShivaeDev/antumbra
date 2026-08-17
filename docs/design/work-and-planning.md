# Work and planning

[Design guides](README.md) · [Glossary](../../GLOSSARY.md) ·
[Binding axioms](../../DESIGN.md)

Antumbra separates durable direction, revisable planning, demand, eligibility,
and execution. That separation lets the fleet keep moving without pretending a
forecast is a promise or a running process is the work itself.

## Authority and staffing

The human is the **admiral**: they set direction, allocate attention and
capacity, and rule without conning any ship. A **captain** is one Agent role
within a Voyage, not the only role an Agent can hold. The captain is the
accountable address for that Voyage and charters its work. Other assigned
Agents are its **crew**. Durable responsibility earns a named Agent;
interchangeable work may use a roster.

The fleet-wide concern lives on a distinguished flagship Voyage whose north
star is the fleet sailing well. Fleet-level rulings and findings belong there,
while the flagship's captain decides what needs broadcasting.

## Voyages and their course

A **Voyage** is the ship under sail for an objective: the top-level durable
object that carries a north star, context, Pieces, and Boards. Antumbra does
not model a separate idle Ship; the ship and its Voyage are one thing. Voyages
may span repositories, nest or link other Voyages, and remain under sail
indefinitely.

**Polaris**, or the north star, is the vision the Voyage moves toward. It is
fixed and never reached. Following it may reveal another north star, but the
current course is always judged against the one that directs this Voyage.

## Ephemerides and the cone of uncertainty

An **ephemeris** is the mutable forecast of how the Voyage may move toward
Polaris. Every fresh sighting may revise it. Waypoints are milestones selected
inside the **cone of uncertainty**: the horizon within which the fleet has
enough evidence to choose honestly. Planning beyond the cone turns uncertainty
into a durable lie.

Charters are dead reckoning, not contracts. They record the current goal,
context, and expected outcome so work can proceed between fixes; reality is
allowed to revise them.

## Legs

A **Leg** is one planning loop:

1. **SIGHT** measures reality and takes the fix.
2. **PLOT** revises the ephemeris and chooses waypoints inside the cone.
3. **SAIL** executes without replanning every gust.
4. **DRIFT** compares the plotted course with the actual track and feeds the
   next sighting.

Legs are sequential story, not execution gates. Parallel work is expressed by
sibling Voyages, and Pieces cross a Leg boundary whenever dependency edges
allow it.

## Pieces

A **Piece** is a bounded place for durable work. It holds its charter, Board,
links, questions, intent history, and zero or more typed expected Outcomes;
nothing executes inside it. Agents act on its behalf through mortal Intents.

Pieces depend on Pieces. Their links to assigned Agents, execution contexts,
and Outcomes permit multiplicity; each Agent assignment has its own typed
responsibility. Repositories are registered once at the app level and are not
Piece containers. This prevents one-Piece-one-repository, one-Piece-one-Agent,
and one-Piece-one-Change assumptions from becoming product law.

Plans bend by editing typed links: promote, park, reorder, add or remove a
dependency, split, or merge. Position moves; durable substance does not.

## Occultations and dependency blockage

An **occultation** is a bird's-eye obstacle that hides part of the planned
course and must be navigated around or cleared. The word is intentionally
different from a Piece being **blocked**, which is a derived local fact: one
or more unfinished predecessors currently gate it. Finishing those
predecessors clears that blockage; an occultation may require a wider change
to the ephemeris.

Real ordering lives in the Piece dependency graph. If B depends on A, A gates
B. Cycles are surfaced for a captain to reshape rather than hidden by an
invented order.

## Posture, readiness, and progress

**Posture** is the admiral's standing direction toward a governed subject. On
a Piece it records durable demand or restraint—for example, whether the
admiral wants the work—so Agents can infer ordinary decisions without asking
again. It is not execution status.

Posture, readiness, queueing, and progress answer different questions:

- desired means the admiral wants the work to happen;
- ready means it can start under dependencies and current assignment truth;
- queued means it will start when admitted capacity is available; and
- progress is derived from durable facts such as assignment, established
  resources, provider acceptance, and landed Outcomes.

Launching changes durable demand; reconciliation decides when eligible demand
needs a dispatch Intent. Parking withdraws demand from the pool without
deleting the Piece, its finished work, or its history. Done is derived from
landed Outcomes and pending obligations, never declared, and done work remains
available as the parent of a follow-up. A captain launching through an Agent
tool and the admiral launching through the app express the same durable demand;
neither starts a hidden Voyage-level process.
