import { Data } from "effect";

export class AgentNotFound extends Data.TaggedError("AgentNotFound")<{
	readonly agentId: string;
}> {}
