import { Database } from "@antumbra/persistence";
import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { ensureAgentResourcesUnclaimed } from "#resource-reclaim-guard.ts";
import type { SpawnFields } from "#spawn.ts";

// why: the crew row is written beside the agent row rather than after the
// session opens, so a spawn that fails partway still leaves the voyage
// pointing at the crew it was given — a settled dormant Agent remains visible
// on its voyage instead of vanishing with the attempt.
export const assignToVoyage = (deps: AgentDeps, payload: SpawnFields) => {
	const voyageId = payload.voyageId;
	if (voyageId === undefined) {
		return Effect.void;
	}
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const created = yield* provide(
			deps.writer.write(
				Effect.gen(function* () {
					yield* ensureAgentResourcesUnclaimed(payload.agentId).pipe(
						Effect.provideService(Database, deps.db),
					);
					const existing = yield* deps.db.VoyageAgent.where({
						agentId: payload.agentId,
						voyageId,
					}).first();
					if (Option.isSome(existing)) {
						return false;
					}
					yield* deps.db.VoyageAgent.create({
						agentId: payload.agentId,
						role: payload.role,
						voyageId,
					});
					return true;
				}),
			),
		);
		if (created) {
			yield* PubSub.publish(deps.feeds.voyages, undefined);
		}
	});
};
