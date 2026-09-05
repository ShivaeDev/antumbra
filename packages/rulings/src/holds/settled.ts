import { Effect, Option, PubSub } from "effect";
import { heldEndOf } from "#holds/held-end.ts";
import { Rulings } from "#rulings.ts";

export const settledAfter = Effect.fnUntraced(function* (notices: PubSub.Subscription<void>, rulingId: string, asksBefore: number) {
	const rulings = yield* Rulings;
	let end = heldEndOf(yield* rulings.get(rulingId), asksBefore);
	while (Option.isNone(end)) {
		yield* PubSub.take(notices);
		end = heldEndOf(yield* rulings.get(rulingId), asksBefore);
	}
	if (end.value._tag === "ruled") {
		yield* rulings.markDelivered(rulingId);
	}
	return end.value;
});
