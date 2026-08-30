import { Data } from "effect";

export {
	BoardOwnerNotFound,
	BoardSourceConflict,
	MailNotAddressed,
	StoredBoardEntryInvalid,
} from "@antumbra/boards";
export {
	EdgeWouldCycle,
	PieceNotFound,
	StoredPieceVerdictInvalid,
	VoyageNotFound,
} from "@antumbra/pieces";
export {
	ResourceOwnerUnavailable,
	ResourceReclaimClaimed,
	ResourceReclaimClaimInvalid,
} from "@antumbra/resource-reclamation";
export {
	SessionAttachmentFailure,
	SessionNotLive,
} from "@antumbra/session-fabric";
export {
	AgentSessionConflict,
	CurrentSessionInvalid,
	SessionEnded,
	SessionIdentityMissing,
	SessionMessageEmpty,
	SessionNotFound,
	SessionStillDelegating,
} from "@antumbra/sessions";
export {
	CaptainAlreadyHailed,
	CaptainSessionUnavailable,
} from "#captain-errors.ts";
export {
	PieceAbandoned,
	PieceAlreadyCrewed,
	PieceNotOnVoyage,
} from "#piece-work-errors.ts";

export class AgentNotFound extends Data.TaggedError("AgentNotFound")<{
	readonly agentId: string;
}> {}

// why: a situation names a Change the host is presenting. One that has been
// forgotten, or that the host never gave a name to, has no threads, no checks
// and no merge to be blocked, so there is nothing to draft about it.
export class ChangeNotAddressable extends Data.TaggedError(
	"ChangeNotAddressable",
)<{
	readonly changeId: string;
}> {
	override get message(): string {
		return `change ${this.changeId} is not open on a host that names it`;
	}
}

// why: a retire is asked for by a button or by the clock, both reading a
// moment that had already passed — so the act asks again as it runs, and names
// the refusal so the record says why the crew is still sailing. It asks the
// weaker question on purpose: retirement is the only thing that closes a tree
// the record has stopped hearing from, and hiding it behind the whole tree
// settling would seal the one exit a stranded tree has. Ending an Agent
// mid-turn still severs work it is doing, so that alone refuses.
export class AgentStillWorking extends Data.TaggedError("AgentStillWorking")<{
	readonly agentId: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `agent ${this.agentId} is working in session ${this.sessionId} and cannot be retired`;
	}
}

export class UnknownBackendTag extends Data.TaggedError("UnknownBackendTag")<{
	readonly tag: string;
}> {}

export class AgentNotSpawnable extends Data.TaggedError("AgentNotSpawnable")<{
	readonly agentId: string;
	readonly status: string;
}> {}

// why: a birth that fails is settled back to dormant, which is what returns its
// Piece to the pool. An Agent this settlement cannot reach stays spawning, and
// a spawning Agent counts as at work forever — so the one state the settlement
// must never leave behind quietly is named, and says which Session it holds.
export class AgentBirthStranded extends Data.TaggedError("AgentBirthStranded")<{
	readonly agentId: string;
	readonly detail: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `birth of Agent ${this.agentId} for Session ${this.sessionId} could not be settled: ${this.detail}`;
	}
}

// why: an Agent answers through one open root Session at a time, and the
// database holds that rule as a partial unique index. Reaching the index turns
// the rule into a constraint violation nobody can read, so the refusal is made
// here and names the Session already open.
export class AgentRootAlreadyOpen extends Data.TaggedError(
	"AgentRootAlreadyOpen",
)<{
	readonly agentId: string;
	readonly openSessionId: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `Agent ${this.agentId} already answers through open Session ${this.openSessionId}; ${this.sessionId} cannot open a second`;
	}
}

export class MooragePlanConflict extends Data.TaggedError(
	"MooragePlanConflict",
)<{
	readonly agentId: string;
	readonly detail: string;
}> {}
