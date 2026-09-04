import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { requireRuling } from "#read.ts";

export const markDelivered = Effect.fn("Rulings.markDelivered")(function* (rulingId: string) {
	const db = yield* Database;
	const now = yield* Clock.currentTimeMillis;
	yield* requireRuling(rulingId);
	yield* db.Ruling.where({ id: rulingId }).update({ deliveredAt: new Date(now) });
});
