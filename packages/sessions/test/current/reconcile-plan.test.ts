import { expect, it } from "@effect/vitest";
import { Result } from "effect";
import { planCurrentSessionReconciliation } from "#current/reconcile-plan.ts";

const agent = (id: string, status: string, currentSessionId: string | null) => ({ currentSessionId, id, status });

const session = (id: string, agentId: string, status: string, executionStatus = "idle", createdAt = new Date(1)) => ({
	agentId,
	createdAt,
	executionStatus,
	id,
	status,
});

const nothingAttached: ReadonlySet<string> = new Set();

it("accepts only a missing Session as a spawning reservation", () => {
	const reserved = planCurrentSessionReconciliation([agent("agent-a", "spawning", "session-reserved")], [], nothingAttached);
	expect(Result.isSuccess(reserved)).toBe(true);
	const stolen = planCurrentSessionReconciliation(
		[agent("agent-a", "spawning", "session-b"), agent("agent-b", "alive", "session-b")],
		[session("session-b", "agent-b", "open")],
		nothingAttached,
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
		nothingAttached,
	);
	expect(Result.isFailure(planned)).toBe(true);
	if (Result.isFailure(planned)) {
		expect(planned.failure._tag).toBe("CurrentSessionInvalid");
	}
});

it("clears inactive pointers and closes inactive and orphan Sessions", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-dormant", "dormant", "session-dormant")],
		[session("session-dormant", "agent-dormant", "open"), session("session-orphan", "agent-missing", "open")],
		nothingAttached,
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [],
			executionsToSettle: [],
			pointers: [
				{
					agentId: "agent-dormant",
					currentSessionId: null,
					fromCurrentSessionId: "session-dormant",
				},
			],
			sessionsToClose: ["session-dormant", "session-orphan"],
		}),
	);
});

it("reclaims an Agent holding neither a pointer nor an open Session", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-alive", "alive", null), agent("agent-spawning", "spawning", null)],
		[session("session-spent", "agent-alive", "closed")],
		nothingAttached,
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [
				{
					agentId: "agent-alive",
					fromStatus: "alive",
					status: "dormant",
				},
				{
					agentId: "agent-spawning",
					fromStatus: "spawning",
					status: "dormant",
				},
			],
			executionsToSettle: [],
			pointers: [],
			sessionsToClose: [],
		}),
	);
});

it("leaves an Agent that still holds an open Session alone", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-alive", "alive", null)],
		[session("session-held", "agent-alive", "open")],
		nothingAttached,
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [],
			executionsToSettle: [],
			pointers: [
				{
					agentId: "agent-alive",
					currentSessionId: "session-held",
					fromCurrentSessionId: null,
				},
			],
			sessionsToClose: [],
		}),
	);
});

// Only the process that began a drain can finish it, so a detached draining row is stale after process exit.
it("settles a draining Session that nothing is attached to", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-alive", "alive", "session-drained")],
		[session("session-drained", "agent-alive", "open", "draining")],
		nothingAttached,
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [],
			executionsToSettle: [{ executionStatus: "idle", sessionId: "session-drained" }],
			pointers: [],
			sessionsToClose: [],
		}),
	);
});

it("leaves a Session draining inside a live attachment alone", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-alive", "alive", "session-draining")],
		[session("session-draining", "agent-alive", "open", "draining")],
		new Set(["session-draining"]),
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [],
			executionsToSettle: [],
			pointers: [],
			sessionsToClose: [],
		}),
	);
});

it("does not settle a draining Session it is closing", () => {
	const planned = planCurrentSessionReconciliation(
		[agent("agent-dormant", "dormant", "session-drained")],
		[session("session-drained", "agent-dormant", "open", "draining")],
		nothingAttached,
	);
	expect(planned).toEqual(
		Result.succeed({
			agentsToReclaim: [],
			executionsToSettle: [],
			pointers: [
				{
					agentId: "agent-dormant",
					currentSessionId: null,
					fromCurrentSessionId: "session-drained",
				},
			],
			sessionsToClose: ["session-drained"],
		}),
	);
});
