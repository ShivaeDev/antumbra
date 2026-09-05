import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";

export interface OpenVoyageInput {
	readonly backend: string;
	readonly context: string;
	readonly focused?: boolean;
	readonly name: string;
	readonly northStar: string;
}

export const open = Effect.fn("Voyages.open")(function* (input: OpenVoyageInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const row = {
		captainBackend: input.backend,
		context: input.context,
		crewBackend: input.backend,
		focusedAt: input.focused === true ? new Date(now) : null,
		id: crypto.randomUUID(),
		kind: "voyage" as const,
		name: input.name,
		northStar: input.northStar,
	};
	const created = yield* db.Voyage.create(row);
	yield* feeds.publishVoyageRefresh();
	return created;
});
