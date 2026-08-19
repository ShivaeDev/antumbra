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

export class SessionNotLive extends Data.TaggedError("SessionNotLive")<{
	readonly sessionId: string;
}> {}

export class SessionAttachmentFailure extends Data.TaggedError(
	"SessionAttachmentFailure",
)<{
	readonly detail: string;
}> {}

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
}> {}

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
