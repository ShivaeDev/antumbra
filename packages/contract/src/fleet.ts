import {
	ResourceReclaimStateSchema,
	SessionPresenceSchema,
} from "@antumbra/vocabulary/agent-runtime";
import { Schema } from "effect";
import { ChangeView } from "#change-views.ts";
import { QuayGroup } from "#quay-views.ts";
import { SessionSituation } from "#session-situations.ts";
import {
	AgentDiagnostics,
	FleetDiagnostics,
	SessionDiagnostics,
} from "#sight-diagnostics.ts";

// why: what the fleet looks like when it is read — one Session, one Agent, the
// resources under it, and the whole roster. It is its own file because these
// shapes are the projection's contract, while the acts beside them are how the
// projection is changed; the two move for different reasons.
export const SessionSummary = Schema.Struct({
	// why: the situations on this Session's Changes that the admiral can put it
	// back on, published as a list rather than left for a view to work out from
	// Change rows it would first have to be given. Empty is the ordinary case:
	// nothing is wrong, or nothing can be said to this Session anyway.
	addressable: Schema.Array(SessionSituation),
	backend: Schema.String,
	canAttachImages: Schema.Boolean,
	canInterrupt: Schema.Boolean,
	// why: whether the admiral's words can reach this Session now, published as
	// a capability so no affordance is ever derived from raw execution state.
	canSend: Schema.Boolean,
	// why: whether this Session may be put to rest now — its own work declared
	// finished and nothing it delegated still speaking. It is published rather
	// than derived because only the domain can see the second half: a whole tree
	// rides the Session's one attachment, and no field of this row says what is
	// travelling on it.
	canSleep: Schema.Boolean,
	cwd: Schema.String,
	diag: SessionDiagnostics,
	id: Schema.String,
	// why: what the Session is doing about being spoken to, curated by the
	// domain so a view never has to read execution state to word a footer. It
	// stands beside the capabilities rather than replacing them: presence says
	// what a reader is looking at, `canSend` says what they may do.
	presence: SessionPresenceSchema,
	status: Schema.String,
});
export type SessionSummary = typeof SessionSummary.Type;

export const BerthSummary = Schema.Struct({
	branch: Schema.String,
	reclaimState: Schema.NullOr(ResourceReclaimStateSchema),
	slug: Schema.String,
	status: Schema.String,
});
export type BerthSummary = typeof BerthSummary.Type;

// why: where a change a piece produced stands, in the words the quay sorts by
// — and landed beside them, because the quay stops listing a change the moment
// it merges while a card still wants to say that it did. The reading is the
// domain's own ladder, published so a card never ranks checks and reviews a
// second time from the neutral fields beside it.
export const WorkChangeStanding = Schema.Union([
	QuayGroup,
	Schema.Literal("landed"),
]);
export type WorkChangeStanding = typeof WorkChangeStanding.Type;

export const WorkChange = Schema.Struct({
	change: ChangeView,
	standing: WorkChangeStanding,
});
export type WorkChange = typeof WorkChange.Type;

// why: what an Agent is doing is a Piece it is assigned to, named with the
// voyage that chartered it, or the voyage it commands — a captain answers to
// a voyage directly and has no piece of its own to be named by. The two are
// one union so a card reads work off one field whichever kind it is.
export const PieceWork = Schema.Struct({
	changes: Schema.Array(WorkChange),
	kind: Schema.Literal("piece"),
	pieceId: Schema.String,
	pieceTitle: Schema.String,
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type PieceWork = typeof PieceWork.Type;

export const VoyageCommand = Schema.Struct({
	kind: Schema.Literal("voyage"),
	voyageId: Schema.String,
	voyageName: Schema.String,
});
export type VoyageCommand = typeof VoyageCommand.Type;

export const AgentWork = Schema.Union([PieceWork, VoyageCommand]);
export type AgentWork = typeof AgentWork.Type;

export const AgentSummary = Schema.Struct({
	berths: Schema.Array(BerthSummary),
	// why: whether this Agent may be ended now. Retirement stops every Session
	// it answers through, so it is withheld while one of them is mid-turn — and
	// offered in every other state, because it is also the only thing that
	// closes a record nothing else can settle.
	canRetire: Schema.Boolean,
	charter: Schema.String,
	diag: AgentDiagnostics,
	id: Schema.String,
	role: Schema.String,
	sessions: Schema.Array(SessionSummary),
	status: Schema.String,
	work: Schema.Array(AgentWork),
});
export type AgentSummary = typeof AgentSummary.Type;

export const RepoSummary = Schema.Struct({
	defaultRef: Schema.String,
	id: Schema.String,
	name: Schema.String,
	source: Schema.String,
});
export type RepoSummary = typeof RepoSummary.Type;

// why: the fleet carries what every spawn is made of — the backends the host
// registered and the repos every agent is moored to. The renderer offers
// these, never a list of its own.
export const Fleet = Schema.Struct({
	agents: Schema.Array(AgentSummary),
	backends: Schema.Array(Schema.String),
	diag: FleetDiagnostics,
	repos: Schema.Array(RepoSummary),
});
export type Fleet = typeof Fleet.Type;
