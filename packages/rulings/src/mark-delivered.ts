import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { requireRuling } from "#read.ts";

const writeDelivered = (rulingId: string, at: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* requireRuling(rulingId);
		yield* db.Ruling.where({ id: rulingId }).update({ deliveredAt: at });
	});

// why: the mark is a write like any other, so it takes its turn behind the
// verdicts and requests landing beside it instead of racing them.
export const markDelivered = Effect.fn("rulings.markDelivered")(function* (
	rulingId: string,
) {
	const db = yield* Database;
	const now = yield* Clock.currentTimeMillis;
	yield* db.transaction(writeDelivered(rulingId, new Date(now)));
});
