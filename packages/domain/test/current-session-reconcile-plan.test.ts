import { expect, it } from "@effect/vitest";
import { Result } from "effect";
import { planCurrentSessionReconciliation } from "#current-session-reconcile-plan.ts";

const agent = (
	id: string,
	status: string,
	currentSessionId: string | null,
) => ({ currentSessionId, id, status });

const session = (
	id: string,
	agentId: string,
	status: string,
	createdAt = new Date(1),
) => ({ agentId, createdAt, id, status });

it("accepts only a missing Session as a spawning reservation", () => {
	const reserved = planCurrentSessionReconciliation(
		[agent("agent-a", "spawning", "session-reserved")],
		[],
	);
	expect(Result.isSuccess(reserved)).toBe(true);
	const stolen = planCurrentSessionReconciliation(
		[
			agent("agent-a", "spawning", "session-b"),
			agent("agent-b", "alive", "session-b"),
		],
		[session("session-b", "agent-b", "open")],
	);
	expect(Result.isFailure(stolen)).toBe(true);
	if (Result.isFailure(stolen)) {
		expect(stolen.failure._tag).toBe("CurrentSessionInvalid");
	}
});

it("rejects an alive pointer to closed history", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-a", "alive", "session-a")],
		[session("session-a", "agent-a", "closed")],
	);
	expect(Result.isFailure(planned)).toBe(true);
	if (Result.isFailure(planned)) {
		expect(planned.failure._tag).toBe("CurrentSessionInvalid");
	}
});

it("clears inactive pointers and closes inactive and orphan Sessions", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-dormant", "dormant", "session-dormant")],
		[
			session("session-dormant", "agent-dormant", "open"),
			session("session-orphan", "agent-missing", "open"),
		],
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [],
			pointers: [{ agentId: "agent-dormant", currentSessionId: null }],
			sessionsToClose: ["session-dormant", "session-orphan"],
		}),
	);
});

it("reclaims an Agent holding neither a pointer nor an open Session", () => {
	const planned = planCurrentSessionReconciliation(
		[
			agent("agent-alive", "alive", null),
			agent("agent-spawning", "spawning", null),
		],
		[session("session-spent", "agent-alive", "closed")],
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [
				{ agentId: "agent-alive", status: "dormant" },
				{ agentId: "agent-spawning", status: "dormant" },
			],
			pointers: [],
			sessionsToClose: [],
		}),
	);
});

it("leaves an Agent that still holds an open Session alone", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-alive", "alive", null)],
		[session("session-held", "agent-alive", "open")],
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [],
			pointers: [{ agentId: "agent-alive", currentSessionId: "session-held" }],
			sessionsToClose: [],
		}),
	);
});
