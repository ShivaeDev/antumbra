# Work and planning

[Design guides](README.md) · [Glossary](../../GLOSSARY.md) · [Binding axioms](../../DESIGN.md)

Antumbra separates durable direction, revisable planning, demand, eligibility, and execution. That separation lets the fleet keep moving without
pretending a forecast is a promise or a running process is the work itself.

## Authority and staffing

The human is the **admiral**: they set direction, allocate attention and capacity, and rule without conning any ship. Every Voyage has a **captain**:
an Agent role that is the Voyage's accountable address and charters its work. Other assigned Agents are its **crew**. Every Voyage remains addressable
as if crewed and may be hailed; Antumbra can materialize a standing identity where one exists or a fresh context over its durable record without
keeping permanent crew. Durable responsibility earns a named Agent; interchangeable work may use a roster.

A Voyage also names what its agents sail with. For each role — captain and crew — it holds the backend, the model, and the effort, so the admiral
chooses who does the work and how hard it thinks rather than accepting whatever a provider defaults to. Model and effort are the backend's own
identifiers, stored as given: there is no cross-backend name for a model, and inventing one would only lose what the backend meant. A session reads the
Voyage's settings when it opens, so changing them reaches the next session rather than the one already sailing.

Work is chartered to Agents through explicit assignments. Agents never shop for or select their own work from the pool; reconciliation acts on the
durable demand and assignments captains and the admiral have established.

The fleet-wide concern lives on a distinguished **flagship** Voyage, and its captain is the highest-level agent in the fleet. The
[flagship guide](flagship.md) owns both.

## Voyages and their course

A **Voyage** is the ship under sail for an objective: the top-level durable object that carries a north star, context, Pieces, and Boards. Antumbra
does not model a separate idle Ship; the ship and its Voyage are one thing. Voyages may span repositories, nest or link other Voyages, and remain
under sail indefinitely.

**Polaris**, or the north star, is the vision the Voyage moves toward. It is fixed and never reached. Following it may reveal another north star, but
the current course is always judged against the one that directs this Voyage.

## Ephemerides and the cone of uncertainty

_Intended, not yet built._ A Voyage carries a north star and context and nothing else about its course; see [intended](intended.md).

An **ephemeris** is the mutable forecast of how the Voyage may move toward Polaris. Every fresh sighting may revise it. Waypoints are milestones
selected inside the **cone of uncertainty**: the horizon within which the fleet has enough evidence to choose honestly. Planning beyond the cone turns
uncertainty into a durable lie.

Charters are dead reckoning, not contracts. They record the current goal, context, and expected outcome so work can proceed between fixes; reality is
allowed to revise them.

## Legs

_Intended, not yet built._ Nothing records a Leg; the loop is how a captain is asked to think, not a state the app keeps; see [intended](intended.md).

A **Leg** is one planning loop:

1. **SIGHT** measures reality and takes the fix.
2. **PLOT** revises the ephemeris and chooses waypoints inside the cone.
3. **SAIL** executes without replanning every gust.
4. **DRIFT** compares the plotted course with the actual track and feeds the next sighting.

Legs are sequential story, not execution gates. Parallel work is expressed by sibling Voyages, and Pieces cross a Leg boundary whenever dependency
edges allow it.

## Pieces

A **Piece** is a bounded place for durable work. It holds its charter, Board, links, intent history, and zero or more typed expected Outcomes; nothing
executes inside it. Agents act on its behalf through mortal Intents.

Pieces depend on Pieces. Their links to assigned Agents, execution contexts, and Outcomes permit multiplicity; each Agent assignment has its own typed
responsibility. Repositories are registered once at the app level and are not Piece containers. This prevents one-Piece-one-repository,
one-Piece-one-Agent, and one-Piece-one-Change assumptions from becoming product law.

Plans bend by editing typed links: promote, park, reorder, add or remove a dependency, split, or merge. Position moves; durable substance does not.

## The frontier

A Voyage's **frontier** is the set of open questions its agents have asked about it: every ruling request from a crew member or captain that names the
Voyage and has not yet been ruled. It is a reading over the ruling records rather than a phase the Voyage passes through, and it marks how far the
course can honestly be plotted: past a question nobody has answered, a plan is a guess.

Chartering reports the frontier rather than stopping at it. A charter always lands, and the tool's reply names the blocking questions standing on the
Voyage and counts the Pieces already chartered and not yet launched; a Piece already launched, parked, or abandoned is settled and counts for nothing.

Those facts inform the captain without deciding for it. Work that does not need an open answer is worth chartering while the question stands, and a
plan that lays out many parallel Pieces before any of them sails is legitimate: its captain may learn only once all of them have run. Refusing would
stop those plans along with the careless ones, and any fixed number of unlaunched Pieces is a guess about a Voyage the rule has never seen. The reply
says what stands, the standing orders say to charter what does not need the answer, and the judgment stays with the captain.

## Occultations and dependency blockage

_Occultations are intended, not yet built._ Dependency blockage is derived from the Piece graph today; nothing records an occultation; see
[intended](intended.md).

An **occultation** is a bird's-eye obstacle that hides part of the planned course and must be navigated around or cleared. The word is intentionally
different from a Piece being **blocked**, which is a derived local fact: one or more unfinished predecessors currently gate it. Finishing those
predecessors clears that blockage; an occultation may require a wider change to the ephemeris.

Real ordering lives in the Piece dependency graph. If B depends on A, A gates B. Cycles are surfaced for a captain to reshape rather than hidden by an
invented order.

## Posture, readiness, and progress

_The general record is intended, not yet built._ A Piece's `launchedAt` and `parkedAt` are the whole of stored posture today, and no other subject has
one; see [intended](intended.md).

**Posture** is the admiral's standing direction toward a governed subject. On a Piece it records durable demand or restraint—for example, whether the
admiral wants the work—so Agents can infer ordinary decisions without asking again. It is not execution status.

Posture, readiness, queueing, and progress answer different questions:

- desired means the admiral wants the work to happen;
- ready means it can start under dependencies and current assignment truth;
- queued means it will start when admitted capacity is available; and
- progress is derived from durable facts such as assignment, established resources, provider acceptance, and landed Outcomes.

Launching changes durable demand; reconciliation decides when eligible demand needs a dispatch Intent. Parking withdraws demand from the pool without
deleting the Piece, its finished work, or its history. Done is derived from landed Outcomes and pending obligations, never declared, and done work
remains available as the parent of a follow-up. A captain launching through an Agent tool and the admiral launching through the app express the same
durable demand; neither starts a hidden Voyage-level process.

## Verdicts

Some things the fleet cannot settle on its own. A Change that closed without merging may be a dead end or a step on the way to a replacement; a Piece
whose work is finished in the admiral's judgment may have no landed Outcome to show for it. A **verdict** is the admiral's own word about such a case,
and it is stored as a landed fact the derivations read like any other row — never as an answer written over what they conclude. Dismissing a Change
settles what it is owed without editing how it died. A Piece verdict of delivered or abandoned is an outcome, so the ladder counts it among the landed
and still derives the state; abandoned is a state of its own rather than done wearing a badge, because the two mean different things to everyone
reading the board.

A Change that closed without merging counts as a pending obligation only while a replacement on the same Piece is being prepared or is already open.
With no live sibling it is a dead end rather than work in flight: it stops gating the Piece, releases the berth it was written in, and waits for a
verdict — visible, never load-bearing.
