# The flagship

[Design guides](README.md) · [Glossary](../../GLOSSARY.md) · [Binding axioms](../../DESIGN.md)

The fleet has concerns of its own: how it is sailing, what binds every Voyage in it, and what the admiral wants done next. Those concerns need a place
to live and an agent to address, and Antumbra gives them both without inventing an entity for them. The **flagship** is a Voyage like any other,
distinguished only by its kind, and its captain is the highest-level agent in the fleet.

## The flagship Voyage

A Voyage carries a closed **kind**. Exactly one Voyage's kind is `flagship`; every other Voyage's kind is `voyage`. Nothing else separates them. The
flagship holds a Polaris, Pieces, and Boards, is hailed and chartered, and is read by every projection that reads a Voyage.

What the kind settles is meaning. The flagship's north star is the fleet's north star — the fleet sailing well — and the flagship's Board is the fleet
Board. Fleet-wide rulings and findings land there because there is nowhere else for them to land: there is no fleet record beside the Voyages, and the
flagship is why none is needed.

The system ensures on first run that the flagship Voyage exists, and opening a second is refused by name rather than quietly ignored. Boot writes the
row and stops there; no session is spawned to hold it.

## The flagship captain

Every Voyage has a captain. The flagship's captain is the highest-level agent in the fleet: the one agent the admiral talks to for things to get done,
and the agent that does things for the admiral. It stands in for the admiral on high-level rulings, and it carries the admiral's asks into the fleet.

"The admiral's chief of staff" is the right label, with one qualification: a chief of staff who runs daily allocation is not what this is. The
flagship captain is a place to bring an ask and an authority that can answer it, not a layer every piece of work passes through.

The flagship captain always exists. It is born on its first hail, like every captain, and persists from then on as a long-lived captain under the
ordinary rules of [rest and reaping](agent-recovery.md#rest-and-reaping): it stands down when it has nothing left to do, takes a siesta by the clock
or on the admiral's word, and wakes when it is spoken to. It is hailable at any time; a siesta changes what holds it, never whether it is there.

## On the ladder

A ruling request climbs from its voyage captain to the flagship captain to the admiral. The flagship captain is the authority for the **fleet**
radius: it answers requests whose answer will apply fleet-wide, and on requests it may not answer it adds context and passes them up. Like any captain
on the way, it may reclassify either axis by appending beside the asker's declaration. The [rulings guide](rulings.md) owns the record, the axes, and
the climb.

The admiral is not displaced by it. The admiral may answer first, reclassify what the flagship classified, or supersede a ruling the flagship made. No
radius is reserved for the admiral by construction: what the admiral holds is a standing right over every rung, not a rung of their own that the
ladder keeps empty.

The flagship captain holds the rung above every voyage captain: a request its own captain would not settle reaches it as mail like everything else
that reaches an agent, and it rules on that request with the same tool every captain has. Its reach is the fleet's, so nothing that climbs to it is
too narrow for it to answer, and what only the admiral may settle it passes up with what it knows.

## Talking to it

The admiral reaches the flagship captain over the rails every captain has: hail it and speak, send it mail, or write on the flagship Board. No rail is
built for the flagship, and what reaches the captain is ordered by the same precedence that orders every Agent's mail.

What the app adds is a place to stand. The window gives the flagship its own tab, and that tab opens on the captain's conversation rather than on a
dashboard about it. The fleet's highest-level agent is somewhere to talk, not somewhere to navigate to.

## What it does

On the admiral's word the flagship captain may open a Voyage, charter a Piece on a named Voyage, and proclaim a fleet ruling as the `flagship`
authority. It also rules on the requests that climb to it, as that same authority, and passes up what only the admiral may settle. Beside those acts
it reads the fleet whole — every Voyage, where it stands, and who captains it — because a Voyage it charters onto is one it has to be able to name.
These are the ordinary domain acts, called by an agent that happens to sit at the top; the flagship gets no private verbs and no act the admiral could
not perform directly.

Everything it does lands on the fleet Board, so what was done in the admiral's name reads as one story rather than as changes discovered later across
scattered Voyages. Fleet-level rulings and findings belong on that Board, and the flagship captain decides what among them needs broadcasting to the
other Voyages: broadcast is a captain's act, not machinery. The set of acts starts small on purpose and widens as use shows what is missing.

## What the flagship is not

It is not a manager of agents. Allocating agents across the fleet, chartering every Voyage, and watching the Quay are not what it is for — such
watching is work any captain may be given. The flagship captain is where an ask enters the fleet and where a fleet-wide question is settled, not the
fleet's dispatcher.

It is not a second kind of entity. There is no fleet record, no fleet Board beside the flagship's, and no projection that has to ask whether the fleet
exists before reading it.

It is not where the fleet's work executes. Like every Voyage it is a place: Pieces hold the durable work and agents act for them through mortal
Intents.

## Open questions

Which acts join the flagship captain's set, and on what evidence. The set so far covers opening work and settling fleet-wide questions; the missing
ones should be named by asks the captain could not carry out, not by anticipation.

How much a rung absorbs. Voyage captains now hold the first rung, so what still climbs past them to the flagship and on to the admiral is the evidence
for whether the ladder carries its weight or merely forwards it.
