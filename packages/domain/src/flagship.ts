import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend";
import { Effect, Layer, Option } from "effect";

const FLAGSHIP = {
	context: "Fleet-level rulings and findings belong here.",
	name: "Flagship",
	northStar: "The fleet sails well.",
} as const;

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

export const ensureFlagship = Effect.gen(function* () {
	const db = yield* Database;
	const standing = yield* db.Voyage.where({ kind: "flagship" }).first();
	if (Option.isSome(standing)) {
		return;
	}
	yield* db.Voyage.create({
		captainBackend: FIRST_BACKEND,
		captainEffort: null,
		captainModel: null,
		context: FLAGSHIP.context,
		crewBackend: FIRST_BACKEND,
		crewEffort: null,
		crewModel: null,
		focusedAt: null,
		id: crypto.randomUUID(),
		kind: "flagship",
		name: FLAGSHIP.name,
		northStar: FLAGSHIP.northStar,
	});
	const feeds = yield* DomainFeeds;
	yield* feeds.publishVoyageRefresh();
});

export const FlagshipLive = Layer.effectDiscard(ensureFlagship);
