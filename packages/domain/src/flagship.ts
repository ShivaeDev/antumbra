import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend";
import { Data, Effect, Layer, Option } from "effect";

export class FlagshipAlreadyExists extends Data.TaggedError(
	"FlagshipAlreadyExists",
)<{
	readonly voyageId: string;
}> {
	override get message(): string {
		return `the fleet already sails under flagship voyage ${this.voyageId}`;
	}
}

// why: the fleet's own concern, taken from the design guide so the words the
// admiral reads on the flagship are the words the guide gave it.
const FLAGSHIP = {
	context: "Fleet-level rulings and findings belong here.",
	name: "Flagship",
	northStar: "The fleet sails well.",
} as const;

// why: the flagship is written before any host has said which agent CLIs it
// found, so it points at the first backend this app ships rather than at a
// registration that may not exist yet. The admiral switches it like any other
// voyage's, and nothing spawns until a hail asks for a captain.
const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

const writeFlagship = Effect.gen(function* () {
	const db = yield* Database;
	const standing = yield* db.Voyage.where({ kind: "flagship" }).first();
	if (Option.isSome(standing)) {
		return yield* new FlagshipAlreadyExists({ voyageId: standing.value.id });
	}
	yield* db.Voyage.create({
		backend: FIRST_BACKEND,
		context: FLAGSHIP.context,
		focusedAt: null,
		id: crypto.randomUUID(),
		kind: "flagship",
		name: FLAGSHIP.name,
		northStar: FLAGSHIP.northStar,
	});
});

// why: the read and the write are one transaction, so a second boot racing
// this one meets the row rather than the gap that was there when it looked.
// The refusal is the durable rule — there is only ever one flagship — and
// boot is the one caller entitled to meet it and carry on.
export const ensureFlagship = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.transaction(writeFlagship);
	const feeds = yield* DomainFeeds;
	yield* feeds.publishVoyageRefresh();
}).pipe(Effect.catchTag("FlagshipAlreadyExists", () => Effect.void));

// why: boot writes the row and stops there. The flagship's captain is born on
// the first hail like every other captain, so starting the app spawns nothing.
export const FlagshipLive = Layer.effectDiscard(ensureFlagship);
