# Intended, not yet built

[Design guides](README.md) · [Binding axioms](../../DESIGN.md)

A concept in the axioms or the guides is a design commitment, not a claim that code exists for it. This is the list of what is designed and has no
code yet, one line each with what it is for, so a reader can tell the two apart and nobody deletes a to-do for lacking a caller. A guide section that
describes one of these carries a marker pointing here. When one ships, its line leaves this list.

- **Legs** — SIGHT, PLOT, SAIL, DRIFT as a recorded planning loop, so a Voyage's story reads leg by leg. Nothing records a Leg.
  [Guide.](work-and-planning.md#legs)
- **Ephemeris and waypoints** — the revisable forecast of a Voyage's course inside the cone of uncertainty. A Voyage carries a north star and context
  and nothing else about its course. [Guide.](work-and-planning.md#ephemerides-and-the-cone-of-uncertainty)
- **Occultation** — a recorded obstacle in the plan, distinct from a Piece's derived dependency blockage. Only the blockage exists.
  [Guide.](work-and-planning.md#occultations-and-dependency-blockage)
- **Posture** — the admiral's standing stance toward a governed subject, inferable by agents without asking again. A Piece's `launchedAt` and
  `parkedAt` are the only stored posture. [Guide.](work-and-planning.md#posture-readiness-and-progress)
- **Cost tracking and model selection** — accounting for what a Session spends and choosing the model it runs on. Usage events carry per-turn cost and
  the transcript shows it; nothing sums it, and no setting names a model.
- **Approvals as decisions** — recording who decided what, at what scope, when a provider asks. Claude runs with permission mode `auto`; the Codex
  adapter declines every approval request and says so, because no consumer is wired.
- **Smoothing of Boards** — the pass that appends a provenance-bearing summary and advances a frontier. Entries carry a register; agents write the
  rough one and the admiral may write either; no pass exists. [Guide.](attention-and-memory.md#smoothing)
- **Attention lanes and heave-to** — escalation, decision point, finding, and grievance as typed reasons for attention, all stop as a rail, and the
  discussion mode that holds an Agent's context. The decision point is the Ruling and has its record; the rest has no row.
  [Guide.](attention-and-memory.md#attention-lanes)
- **Admission policy** — composable policies, priority classes, "reclaiming outranks finishing outranks starting", and loud, temporary overcommit to
  break a stall. The scheduler admits by creation time; the desktop configures no gates; the running-agent budget is one setting the dispatcher reads.
- **Message precedence and the `queue` path for mail** — routine, priority, and flash choosing between `steer` and `queue`. Precedence is stored on
  mail and shown; every send steers; `queue` carries only the charter at spawn and the instruction handed to a resumed Session.
  [Guide.](attention-and-memory.md#mail-and-precedence)
