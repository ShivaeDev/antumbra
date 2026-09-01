import { IntentExecution } from "@antumbra/kernel";
import { type AgentStatus, agentTransition } from "@antumbra/vocabulary/agent-runtime";
import { Data, Effect, Result } from "effect";

export type SessionUnresumable =
	| {
			readonly _tag: "agent-not-alive";
			readonly agentId: string;
			readonly status: AgentStatus;
	  }
	| { readonly _tag: "draining" }
	| { readonly _tag: "no-agent"; readonly agentId: string }
	| { readonly _tag: "no-root" }
	| { readonly _tag: "not-current"; readonly currentSessionId: string | null }
	| { readonly _tag: "session-closed" };

type UnresumableVerdict = "refuse" | "wait";

export const unresumableVerdict = (reason: SessionUnresumable): UnresumableVerdict => {
	switch (reason._tag) {
		case "agent-not-alive":
			return Result.isSuccess(agentTransition(reason.status, "activate")) ? "wait" : "refuse";
		case "draining":
		case "not-current":
			return "wait";
		case "no-agent":
		case "no-root":
		case "session-closed":
			return "refuse";
	}
};

export const unresumableDetail = (sessionId: string, reason: SessionUnresumable): string => {
	switch (reason._tag) {
		case "agent-not-alive":
			return `Agent ${reason.agentId} is ${reason.status}, and only an alive Agent answers through ${sessionId}`;
		case "draining":
			return `${sessionId} is still draining the execution it was told to finish`;
		case "no-agent":
			return `${sessionId} names Agent ${reason.agentId}, which is not on the fleet`;
		case "no-root":
			return `there is no root Session ${sessionId} to resume`;
		case "not-current":
			return reason.currentSessionId === null
				? `the Agent holds no current Session, so ${sessionId} is not the one to resume`
				: `the Agent is on ${reason.currentSessionId}, not ${sessionId}`;
		case "session-closed":
			return `${sessionId} has closed, and a closed Session has no conversation left to resume`;
	}
};

export class SessionUnresumableRefused extends Data.TaggedError("SessionUnresumableRefused")<{
	readonly detail: string;
	readonly reason: SessionUnresumable["_tag"];
	readonly sessionId: string;
}> {
	override get message(): string {
		return `Session ${this.sessionId} cannot be resumed: ${this.detail}`;
	}
}

export const waitFor = (detail: string) => IntentExecution.use((execution) => execution.wait(detail));

export const unresumable = (sessionId: string, reason: SessionUnresumable) => {
	const detail = unresumableDetail(sessionId, reason);
	return unresumableVerdict(reason) === "wait"
		? waitFor(detail)
		: Effect.fail(
				new SessionUnresumableRefused({
					detail,
					reason: reason._tag,
					sessionId,
				}),
			);
};
