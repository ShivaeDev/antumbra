import { Effect } from "effect";
import { admiralAsks } from "#holds/admiral-asks.ts";
import { reachAsker } from "#replies/reach-asker.ts";
import { questionBackWords } from "#replies/words.ts";
import { Rulings } from "#rulings.ts";

export interface RulingQuestionInput {
	readonly note: string;
	readonly rulingId: string;
}

export const askMore = Effect.fn("RulingReplies.askMore")(function* (input: RulingQuestionInput) {
	const rulings = yield* Rulings;
	const asked = yield* rulings.addContext({ body: input.note, rulingId: input.rulingId });
	const askedAt = admiralAsks(asked).at(-1)?.at.toISOString() ?? asked.id;
	yield* reachAsker(asked, `ruling-ask:${asked.id}:${askedAt}`, questionBackWords(asked, input.note));
	return asked;
});
