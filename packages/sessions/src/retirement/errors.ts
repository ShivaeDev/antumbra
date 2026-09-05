import { Data } from "effect";

export class AgentStillWorking extends Data.TaggedError("AgentStillWorking")<{
	readonly agentId: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `agent ${this.agentId} is working in session ${this.sessionId} and cannot be retired`;
	}
}
