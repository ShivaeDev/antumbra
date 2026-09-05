import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";

import type { OpenVoyageInput } from "#open.ts";

export const ensureFlagship = Effect.fn("Voyages.ensureFlagship")(function* (input: Omit<OpenVoyageInput, "focused">) {
	const db = yield* Database;
	const standing = yield* db.Voyage.where({ kind: "flagship" }).first();
	if (Option.isSome(standing)) {
		return;
	}
	yield* db.Voyage.create({
		captainBackend: input.backend,
		captainEffort: null,
		captainModel: null,
		context: input.context,
		crewBackend: input.backend,
		crewEffort: null,
		crewModel: null,
		focusedAt: null,
		id: crypto.randomUUID(),
		kind: "flagship",
		name: input.name,
		northStar: input.northStar,
	});
	const feeds = yield* DomainFeeds;
	yield* feeds.publishVoyageRefresh();
});
