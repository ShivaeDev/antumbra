import { Effect } from "effect";
import type { RulingParkInput } from "#acts.ts";
import { reachAsker } from "#replies/reach-asker.ts";
import { notNowWords } from "#replies/words.ts";
import { Rulings } from "#rulings.ts";

export const park = Effect.fn("RulingReplies.park")(function* (input: RulingParkInput) {
	const rulings = yield* Rulings;
	const parked = yield* rulings.park(input);
	yield* reachAsker(parked, `ruling-parked:${parked.id}`, notNowWords(parked, input.note));
	return parked;
});
