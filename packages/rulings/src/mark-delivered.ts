import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { requireRuling } from "#read.ts";

export const markDelivered = Effect.fn("rulings.markDelivered")(function* (
	rulingId: string,
) {
	const db = yield* Database;
	yield* requireRuling(rulingId);
	const now = yield* Clock.currentTimeMillis;
	yield* db.Ruling.where({ id: rulingId }).update({
		deliveredAt: new Date(now),
	});
});
