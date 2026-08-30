import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { CurrentSessionReconcilePlan } from "#current-session-reconcile-plan.ts";

export interface CurrentSessionRepair {
	readonly changed: boolean;
	readonly currentSessionId: string | null;
}

// why: resume applies the same repair boot does, from the same plan — an Agent
// with nothing open is reclaimed here too, and the resume it was asked for then
// finds no Session to take, which is the truth.
export const makeCurrentSessionRepair = Effect.gen(function* () {
	const db = yield* Database;
	return (currentSessionId: string | null, plan: CurrentSessionReconcilePlan) =>
		Effect.gen(function* () {
			const reclaimed = yield* Effect.forEach(
				plan.agentsToReclaim,
				(reclaimed) =>
					db.Agent.where({
						currentSessionId: null,
						id: reclaimed.agentId,
						status: reclaimed.fromStatus,
					}).update({
						currentSessionId: null,
						status: reclaimed.status,
					}),
			);
			const pointed = yield* Effect.forEach(plan.pointers, (pointer) =>
				db.Agent.where({
					currentSessionId: pointer.fromCurrentSessionId,
					id: pointer.agentId,
				}).update({ currentSessionId: pointer.currentSessionId }),
			);
			const closed = yield* Effect.forEach(plan.sessionsToClose, (id) =>
				db.AgentSession.where({ id, status: "open" }).update({
					status: "closed",
				}),
			);
			const settled = yield* Effect.forEach(
				plan.executionsToSettle,
				(settled) =>
					db.AgentSession.where({
						executionStatus: "draining",
						id: settled.sessionId,
					}).update({ executionStatus: settled.executionStatus }),
			);
			const changed = [...reclaimed, ...pointed, ...closed, ...settled].some(
				(row) => row !== null,
			);
			return {
				changed,
				currentSessionId:
					currentSessionId ?? plan.pointers[0]?.currentSessionId ?? null,
			} satisfies CurrentSessionRepair;
		});
});
