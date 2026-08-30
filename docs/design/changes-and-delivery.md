# Changes and delivery

[Design guides](README.md) · [Glossary](../../GLOSSARY.md) · [Binding axioms](../../DESIGN.md)

Pieces describe useful results as typed Outcomes. Landing one is a durable domain act; publishing it to another system and observing that system are
effects Antumbra reconciles without inventing success.

## Outcomes

An **Outcome** is one typed result expected from a Piece. A Piece may expect none, one, or many, and new Outcome kinds register through a typed
capability rather than a universal payload. Proposed structure is never an Outcome: workers report what they learned, and captains charter the
resulting work.

A leaf Piece is done only when at least one Outcome has landed and none remains pending. Containers derive completion from their contents and are
never marked done. History remains linked after completion so follow-up work can resume from what actually landed.

## Reports and artifacts

A **Report** is prose for Agents to consume. An **Artifact** is a durable visual result for the admiral. Landing either records an immutable durable
Outcome. Correcting an Artifact creates another Artifact with explicit supersession lineage rather than rewriting what previously landed.

A local file is not a landed Artifact while its only copy lives in an Agent's replaceable Moorage. Its bytes must first be published to app-managed
durable storage. An external URL is a reference to someone else's custody. Resource reclamation never deletes a landed Report or Artifact.

## Changes

A **Change** is a proposed modification to a repository on a branch. It takes time to land, so Antumbra keeps its neutral identity, current stage,
repository and branch while also retaining the presenting integration's raw observation. A provider's answer is evidence about the Change, not mail
and not permission to wake an Agent.

The Change capability is host-neutral. A change host is the integration that presents and observes Changes; GitHub is the first implementation, not
the domain model. A second host can map its own vocabulary onto the same durable reading without leaking provider-specific state into consumers.

Opening publishes prepared work through the registered host. Adopting starts watching a Change already opened outside Antumbra by its stable address.
Both acts reconcile exact durable identity so retries converge instead of creating parallel stories.

## GitHub mapping

For GitHub, the durable Change maps to a pull request and its branch:

| Antumbra reading | GitHub evidence                                                   |
| ---------------- | ----------------------------------------------------------------- |
| prepared         | committed branch work not yet represented by a pull request       |
| open             | an open pull request for that repository and branch               |
| landed           | the pull request merged                                           |
| withdrawn        | prepared work abandoned, or the pull request closed without merge |
| ready to merge   | GitHub reports the pull request clean and mergeable               |

GitHub's exact checks, review records, and state strings stay raw host facts. The mapping above explains their product meaning; it does not replace
the code that decodes GitHub responses.

## The quay

The **Quay** is the admiral's surface for Changes. It groups work by where it stands—still being worked, blocked by the host, or ready to merge—while
showing the host's latest useful evidence. The Quay has no separate durable substance; it is a projection of Changes, Reviews, repositories, Pieces,
and host capability.

Because a Piece may produce several Changes and a Change may satisfy one of several Outcomes, the Quay never assumes one Piece, one repository, or one
pull request are the same object.

## Landing and harvest

**Landing** is the durable acceptance of an Outcome. For a Change, the external host acceptance is the landing event; for GitHub, that acceptance is
merge. Antumbra observes and records it idempotently, then allows dependent work to reconcile against landed code. A Change still waiting on its host
leaves its Piece in the landing projection: out of the work pool, with no crew required merely to wait.

The **harvest** is the set of work produced during an unattended stretch that is now ready for the admiral to review, merge, or otherwise ship. It is
not tied to morning: the point is that long-running work accumulates inspectable durable Outcomes while the admiral's attention is elsewhere.
