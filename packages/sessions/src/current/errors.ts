import { Data } from "effect";

export class AgentSessionConflict extends Data.TaggedError("AgentSessionConflict")<{
	readonly agentId: string;
	readonly currentSessionId: string | null;
	readonly sessionId: string;
}> {
	override get message(): string {
		return this.currentSessionId === null
			? `Agent ${this.agentId} has no current Session; ${this.sessionId} cannot act`
			: `Agent ${this.agentId} belongs to Session ${this.currentSessionId}, not ${this.sessionId}`;
	}
}

export class CurrentSessionInvalid extends Data.TaggedError("CurrentSessionInvalid")<{
	readonly agentId: string;
	readonly detail: string;
}> {
	override get message(): string {
		return `Agent ${this.agentId} has invalid current Session truth: ${this.detail}`;
	}
}
