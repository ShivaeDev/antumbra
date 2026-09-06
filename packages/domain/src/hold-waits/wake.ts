import type { HoldWaiting } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { crewedVoyages } from "#hold-waits/crewed-voyages.ts";
import type { DueWake } from "#mail-delivery/due-wakes.ts";

export const wakeWaiting = Effect.fn("HoldWaits.wakeWaiting")(function* (due: ReadonlyArray<DueWake>) {
	const db = yield* Database;
	const agentIds = due.map((wake) => wake.agentId);
	const agents = yield* db.Agent.where((agent) => agent.id.in(agentIds)).all();
	const roles = new Map(agents.map((agent) => [agent.id, agent.role] as const));
	const voyages = yield* crewedVoyages(agentIds);
	return [...due]
		.sort((left, right) => right.waitedMillis - left.waitedMillis)
		.map(
			(wake) =>
				({
					id: wake.sessionId,
					mail: { count: wake.batch.count, precedence: wake.batch.precedence },
					title: roles.get(wake.agentId) ?? wake.agentId,
					voyage: voyages.get(wake.agentId) ?? null,
					waitedMillis: wake.waitedMillis,
				}) satisfies HoldWaiting,
		);
});
