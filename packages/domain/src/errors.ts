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
