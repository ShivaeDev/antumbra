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

export class SessionNotFound extends Data.TaggedError("SessionNotFound")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `there is no session ${this.sessionId} on the fleet`;
	}
}

// why: the one state that refuses words. Every other state either holds the
// conversation open or can be woken back into it, so this refusal is the whole
// set of ways an Agent can stop being reachable.
export class SessionEnded extends Data.TaggedError("SessionEnded")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `session ${this.sessionId} has ended and cannot be spoken to`;
	}
}

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
