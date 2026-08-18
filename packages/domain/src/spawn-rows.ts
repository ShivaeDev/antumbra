import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { assignToPiece } from "#piece-assignment.ts";
import type { SpawnFields } from "#spawn.ts";
import { reservationFor } from "#spawn-current-session.ts";
import { assignToVoyage } from "#voyage-assignment.ts";

export const ensureAgentRow = (deps: AgentDeps, payload: SpawnFields) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const changed = yield* provide(
			deps.writer.write(
				Effect.gen(function* () {
					const stored = yield* deps.db.Agent.where({
						id: payload.agentId,
					}).first();
					if (Option.isNone(stored)) {
						yield* deps.db.Agent.create({
							charter: payload.charter,
							currentSessionId: payload.sessionId,
							id: payload.agentId,
							role: payload.role,
							status: "spawning",
						});
						return true;
					}
					const reservation = yield* reservationFor(stored.value, payload);
					if (reservation === "current") {
						return false;
					}
					yield* deps.db.Agent.where({
						currentSessionId: null,
						id: payload.agentId,
					}).update({ currentSessionId: payload.sessionId });
					return true;
				}),
			),
		);
		if (changed) {
			yield* PubSub.publish(deps.feeds.fleet, undefined);
			yield* PubSub.publish(deps.feeds.voyages, undefined);
		}
		yield* assignToPiece(deps, payload);
		yield* assignToVoyage(deps, payload);
	});
};
