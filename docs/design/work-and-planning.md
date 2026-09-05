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
identifiers: there is no cross-backend name for a model, and inventing one would only lose what the backend meant. Backend choices govern new
Sessions; model and effort choices also apply when an existing Session resumes. Changing them does not redirect work already running. Available model
lists offer the efforts each model takes, and the admiral may still name a model no list shows, because a model exists before any list knows it.

Work is chartered to Agents through explicit assignments. Agents never shop for or select their own work from the pool; reconciliation acts on the
durable demand and assignments captains and the admiral have established.

The fleet-wide concern lives on a distinguished **flagship** Voyage, and its captain is the highest-level agent in the fleet. The
[flagship guide](flagship.md) owns both.

## Voyages and their course

A **Voyage** is the ship under sail for an objective: the top-level durable object that carries a north star, context, Pieces, and Boards. Antumbra
does not model a separate idle Ship; the ship and its Voyage are one thing. Voyages may span repositories, nest or link other Voyages, and remain
under sail indefinitely.

_Nesting and links between Voyages are intended, not yet built._ Voyages can share Pieces, but cannot be arranged into a hierarchy or linked directly.

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

_Typed expectations are intended, not yet built._ A charter describes its expected result in words; the Outcomes actually produced are typed.

Pieces depend on Pieces. Their links to assigned Agents, execution contexts, and Outcomes permit multiplicity; each Agent assignment has its own typed
responsibility. Repositories are registered once at the app level and are not Piece containers. This prevents one-Piece-one-repository,
one-Piece-one-Agent, and one-Piece-one-Change assumptions from becoming product law.

_Typed responsibility on each assignment is intended, not yet built._ An Agent has a role and charter; its assignment to a Piece does not carry a
separate responsibility.

Plans bend by editing typed links: promote, park, reorder, add or remove a dependency, split, or merge. Position moves; durable substance does not.

_Promotion, explicit reordering, splitting, and merging are intended, not yet built._ Parking and dependency changes let captains revise which work
may proceed and what it must wait for.

## The frontier

A Voyage's **frontier** is the set of open questions Agents have asked about it: every ruling request from an Agent that names the Voyage and has
neither been ruled nor parked. It marks how far the course can honestly be plotted: past a question nobody has answered, a plan is a guess.

Chartering reports the frontier rather than stopping at it. Open questions do not prevent a valid charter, and the captain is told which blocking
questions stand on the Voyage and how many other Pieces await launch. Launched, parked, active, done, and abandoned Pieces do not count as awaiting
launch.

Those facts inform the captain without deciding for it. Work that does not need an open answer is worth chartering while the question stands, and a
plan that lays out many parallel Pieces before any of them sails is legitimate: its captain may learn only once all of them have run. Refusing would
stop those plans along with the careless ones, and any fixed number of unlaunched Pieces is a guess about a Voyage the rule has never seen. The
captain can see what stands and judges which work does not need the answer.

## Occultations and dependency blockage

_Occultations are intended, not yet built._ Dependency blockage is derived from the Piece graph today; nothing records an occultation; see
[intended](intended.md).

An **occultation** is a bird's-eye obstacle that hides part of the planned course and must be navigated around or cleared. The word is intentionally
different from a Piece being **blocked**, which is a derived local fact: unfinished predecessors or unanswered rulings gate its launch demand.
Settling those predecessors or rulings clears that blockage; abandoning a predecessor also releases its dependents. An occultation may require a wider
change to the ephemeris.

Real ordering lives in the Piece dependency graph. If B depends on A, A gates B. Dependencies that would create a cycle are refused so the captain can
reshape the plan.

## Posture, readiness, and progress

_The general record is intended, not yet built._ Launch and park express a Piece's standing demand and restraint; the broader concept has no record;
see [intended](intended.md).

**Posture** is the admiral's standing direction toward a governed subject. On a Piece it records durable demand or restraint—for example, whether the
admiral wants the work—so Agents can infer ordinary decisions without asking again. It is not execution status.

Posture, readiness, queueing, and progress answer different questions:

- desired means the admiral wants the work to happen;
- ready means unfinished, unparked, launched work has no outstanding dependency or ruling gate, active assignee, or pending Outcome;
- queued means an Intent has been submitted and awaits admission; and
- progress reflects who is working and which Outcomes have landed or remain pending.

Launching changes durable demand; eligible work receives an assignment or returns to its assigned Agent when execution and capacity allow. Parking
holds further dispatch without deleting the Piece, its finished work, or its history. Done requires a landed Outcome, no pending obligations, and no
Agent still working the Piece; it is never declared, and done work remains available as the parent of a follow-up. A captain launching through an
Agent tool and the admiral launching through the app express the same durable demand; neither starts a hidden Voyage-level process.

## Verdicts

Some things the fleet cannot settle on its own. A Change that closed without merging may be a dead end or a step on the way to a replacement; a Piece
whose work is finished in the admiral's judgment may have no landed Outcome to show for it. A **verdict** is the admiral's own word about such a case,
and it lands as a fact that contributes to progress. Dismissing a Change settles what it is owed without editing how it died. A Piece verdict of
delivered or abandoned is an Outcome; delivered does not erase pending obligations or work still in progress. Abandoned is a state of its own rather
than done wearing a badge, because the two mean different things to everyone reading the board.

A Change that closed without merging counts as a pending obligation only while it is undismissed and a replacement on the same Piece is prepared or
already open. With no live sibling it is a dead end rather than work in flight: it stops gating the Piece and holding its Berth, and waits for a
verdict without holding up completion.
