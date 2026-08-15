import { Data } from "effect";

export class AgentNotFound extends Data.TaggedError("AgentNotFound")<{
	readonly agentId: string;
}> {}

export class UnknownBackendTag extends Data.TaggedError("UnknownBackendTag")<{
	readonly tag: string;
}> {}

export class UnknownRunnerTag extends Data.TaggedError("UnknownRunnerTag")<{
	readonly tag: string;
}> {}

export class AgentNotSpawnable extends Data.TaggedError("AgentNotSpawnable")<{
	readonly agentId: string;
	readonly status: string;
}> {}

export class SessionNotLive extends Data.TaggedError("SessionNotLive")<{
	readonly sessionId: string;
}> {}

export class PieceNotFound extends Data.TaggedError("PieceNotFound")<{
	readonly pieceId: string;
}> {}

export class EdgeWouldCycle extends Data.TaggedError("EdgeWouldCycle")<{
	readonly fromPieceId: string;
	readonly toPieceId: string;
}> {}

export class VoyageNotFound extends Data.TaggedError("VoyageNotFound")<{
	readonly voyageId: string;
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
