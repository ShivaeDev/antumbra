import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type { SpawnFields } from "#spawn.ts";

// why: the crew row is written beside the agent row rather than after the
// session opens, so a spawn that fails partway still leaves the voyage
// pointing at the captain it hailed — a settled dormant captain is visible on
// its voyage instead of vanishing with the attempt.
export const assignToVoyage = (deps: AgentDeps, payload: SpawnFields) => {
	const voyageId = payload.voyageId;
	if (voyageId === undefined) {
		return Effect.void;
	}
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const existing = yield* provide(
			deps.db.VoyageAgent.where({
				agentId: payload.agentId,
				voyageId,
			}).first(),
		);
		if (Option.isSome(existing)) {
			return;
		}
		yield* provide(
			deps.writer.write(
				deps.db.VoyageAgent.create({
					agentId: payload.agentId,
					role: payload.role,
					voyageId,
				}),
			),
		);
		yield* PubSub.publish(deps.feeds.voyages, undefined);
	});
};
