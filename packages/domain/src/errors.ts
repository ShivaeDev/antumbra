export { VoyageNotFound } from "@antumbra/voyages/errors";

import { Data } from "effect";

export {
	BoardOwnerNotFound,
	BoardSourceConflict,
	MailNotAddressed,
	StoredBoardEntryInvalid,
} from "@antumbra/boards";
export { ChangeNotAddressable } from "@antumbra/changes/errors";
export {
	EdgeWouldCycle,
	PieceNotFound,
	StoredPieceVerdictInvalid,
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
export { AgentStillWorking } from "@antumbra/sessions/retirement/errors";
export { AgentNotFound } from "@antumbra/vocabulary/agent-runtime";
export {
	CaptainAlreadyHailed,
	CaptainSessionUnavailable,
} from "#captain-errors.ts";
export {
	PieceAbandoned,
	PieceAlreadyCrewed,
	PieceNotOnVoyage,
} from "#piece-work-errors.ts";

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

export class SmoothingPassFailed extends Data.TaggedError("SmoothingPassFailed")<{
	readonly day: string;
	readonly detail: string;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `no summary for ${this.day} on voyage ${this.voyageId}: ${this.detail}`;
	}
}
