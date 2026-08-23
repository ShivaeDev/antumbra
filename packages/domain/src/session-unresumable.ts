import {
	type AgentStatus,
	agentTransition,
} from "@antumbra/vocabulary/agent-runtime";
import { Data, Result } from "effect";

// why: "there is nothing here to resume" is six separate truths, and a resume
// that answers all six with the same silence reports work it never did as
// done. Each is named so the Intent can say which one it met, and so the
// choice between waiting for it to change and refusing outright is made once,
// here, rather than at each reader.
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

export type UnresumableVerdict = "refuse" | "wait";

// why: waiting is a promise that the blocker can still clear, so it is only
// honest where the state has a way out. The Agent lifecycle table already
// answers that for a status — dormant and retired have no move back to alive,
// spawning does — so the verdict is read from the table instead of restated
// here as a list that could drift from it. A drain settles and a pointer moves;
// a Session or an Agent that is not on the fleet is not coming back.
export const unresumableVerdict = (
	reason: SessionUnresumable,
): UnresumableVerdict => {
	switch (reason._tag) {
		case "agent-not-alive":
			return Result.isSuccess(agentTransition(reason.status, "activate"))
				? "wait"
				: "refuse";
		case "draining":
			return "wait";
		case "no-agent":
			return "refuse";
		case "no-root":
			return "refuse";
		case "not-current":
			return "wait";
		// why: a closed Session is the one refusal that reads like a wait and is
		// not. Nothing reopens it — the send that would push the wake refuses
		// first, and boot reclaim only requeues what was running — so a wake
		// parked against it would hold the admiral's words for ever.
		case "session-closed":
			return "refuse";
	}
};

export const unresumableDetail = (
	sessionId: string,
	reason: SessionUnresumable,
): string => {
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

// why: the refusals are the reasons no amount of waiting reaches, and a refusal
// that reached the row as a bare stack trace would say less than the silence it
// replaced. The sentence is the message, so the durable detail reads as one.
export class SessionUnresumableRefused extends Data.TaggedError(
	"SessionUnresumableRefused",
)<{
	readonly detail: string;
	readonly reason: SessionUnresumable["_tag"];
	readonly sessionId: string;
}> {
	override get message(): string {
		return `Session ${this.sessionId} cannot be resumed: ${this.detail}`;
	}
}
