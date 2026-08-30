import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend";
import { Data, Effect, Layer, Option } from "effect";

export class FlagshipAlreadyExists extends Data.TaggedError("FlagshipAlreadyExists")<{
	readonly voyageId: string;
}> {
	override get message(): string {
		return `the fleet already sails under flagship voyage ${this.voyageId}`;
	}
}

const FLAGSHIP = {
	context: "Fleet-level rulings and findings belong here.",
	name: "Flagship",
	northStar: "The fleet sails well.",
} as const;

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

const writeFlagship = Effect.gen(function* () {
	const db = yield* Database;
	const standing = yield* db.Voyage.where({ kind: "flagship" }).first();
	if (Option.isSome(standing)) {
		return yield* new FlagshipAlreadyExists({ voyageId: standing.value.id });
	}
	yield* db.Voyage.create({
		captainBackend: FIRST_BACKEND,
		context: FLAGSHIP.context,
		crewBackend: FIRST_BACKEND,
		focusedAt: null,
		id: crypto.randomUUID(),
		kind: "flagship",
		name: FLAGSHIP.name,
		northStar: FLAGSHIP.northStar,
	});
});

export const ensureFlagship = Effect.gen(function* () {
	yield* writeFlagship;
	const feeds = yield* DomainFeeds;
	yield* feeds.publishVoyageRefresh();
}).pipe(Effect.catchTag("FlagshipAlreadyExists", () => Effect.void));

export const FlagshipLive = Layer.effectDiscard(ensureFlagship);
