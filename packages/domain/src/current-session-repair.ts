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
			yield* Effect.forEach(
				plan.agentsToReclaim,
				(reclaimed) =>
					db.Agent.where({ id: reclaimed.agentId }).update({
						currentSessionId: null,
						status: reclaimed.status,
					}),
				{ discard: true },
			);
			yield* Effect.forEach(
				plan.pointers,
				(pointer) =>
					db.Agent.where({
						currentSessionId: null,
						id: pointer.agentId,
					}).update({ currentSessionId: pointer.currentSessionId }),
				{ discard: true },
			);
			yield* Effect.forEach(
				plan.sessionsToClose,
				(id) => db.AgentSession.where({ id }).update({ status: "closed" }),
				{ discard: true },
			);
			yield* Effect.forEach(
				plan.executionsToSettle,
				(settled) =>
					db.AgentSession.where({
						executionStatus: "draining",
						id: settled.sessionId,
					}).update({ executionStatus: settled.executionStatus }),
				{ discard: true },
			);
			return {
				changed:
					plan.agentsToReclaim.length > 0 ||
					plan.executionsToSettle.length > 0 ||
					plan.pointers.length > 0 ||
					plan.sessionsToClose.length > 0,
				currentSessionId:
					currentSessionId ?? plan.pointers[0]?.currentSessionId ?? null,
			} satisfies CurrentSessionRepair;
		});
});
