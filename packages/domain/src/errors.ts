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
	VoyageNotFound,
} from "@antumbra/pieces";
export {
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
} from "#current-session-errors.ts";

export class AgentNotFound extends Data.TaggedError("AgentNotFound")<{
	readonly agentId: string;
}> {}

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

export class SessionMessageEmpty extends Data.TaggedError(
	"SessionMessageEmpty",
)<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `a message with no words cannot reach session ${this.sessionId}`;
	}
}

export class SessionIdentityMissing extends Data.TaggedError(
	"SessionIdentityMissing",
)<{
	readonly sessionId: string;
}> {}

// why: a voyage is under way because its captain is at work, so hailing a
// second one while the first still is would give the voyage two accountable
// addresses. The refusal names the captain it already has.
export class CaptainAlreadyHailed extends Data.TaggedError(
	"CaptainAlreadyHailed",
)<{
	readonly agentId: string;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `voyage ${this.voyageId} already has captain ${this.agentId} at work`;
	}
}

export class CaptainSessionUnavailable extends Data.TaggedError(
	"CaptainSessionUnavailable",
)<{
	readonly agentId: string;
	readonly detail: string;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `captain ${this.agentId} cannot resume: ${this.detail}`;
	}
}
