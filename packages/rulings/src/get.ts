import { Effect } from "effect";
import { loadRuling, requireRuling } from "#read.ts";

export const get = Effect.fn("rulings.get")(function* (rulingId: string) {
	return yield* loadRuling(yield* requireRuling(rulingId));
});
