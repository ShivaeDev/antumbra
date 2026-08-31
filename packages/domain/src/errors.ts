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

export class ChangeNotAddressable extends Data.TaggedError("ChangeNotAddressable")<{
	readonly changeId: string;
}> {
	override get message(): string {
		return `change ${this.changeId} is not open on a host that names it`;
	}
}

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

export class AgentBirthStranded extends Data.TaggedError("AgentBirthStranded")<{
	readonly agentId: string;
	readonly detail: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `birth of Agent ${this.agentId} for Session ${this.sessionId} could not be settled: ${this.detail}`;
	}
}

export class MooragePlanConflict extends Data.TaggedError("MooragePlanConflict")<{
	readonly agentId: string;
	readonly detail: string;
}> {}
