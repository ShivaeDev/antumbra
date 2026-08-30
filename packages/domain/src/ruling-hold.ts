import { DomainFeeds } from "@antumbra/domain-feeds";
import { type Ruling, type RulingAnswer, type RulingRequest, Rulings } from "@antumbra/rulings";
import { Effect, Option, PubSub } from "effect";
import { rulingAnswerMail } from "#ruling-answer-mail.ts";
import { RulingHolds } from "#ruling-holds.ts";

export interface RuledRuling {
	readonly answer: RulingAnswer;
	readonly ruling: Ruling;
}

const ruledOf = (ruling: Ruling): Option.Option<RuledRuling> => Option.map(ruling.answer, (answer) => ({ answer, ruling }));

export const heldSaid = ({ answer, ruling }: RuledRuling): string => `Ruled — your hold is over.\n${rulingAnswerMail(ruling, answer)}`;

// why: a blocking asker holds until ruled, and the hold is the one thing a
// closing session or a restart loses: the ruling stays open on the record and
// its answer still reaches the asker as mail, so nothing here is resumed. The
// subscription is taken before the request is written, so a verdict landing
// between the write and the first read rings a notice that is still queued;
// each notice is followed by a read, because the record — never the ring —
// says whether the answer landed. The hold is registered the moment the id
// exists and marks the answer delivered before it lets go, so the asker that
// heard the answer here is not told it again by mail.
export const makeRulingHold = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const holds = yield* RulingHolds;
	const rulings = yield* Rulings;
	const untilRuled = (notices: PubSub.Subscription<void>, rulingId: string) =>
		Effect.gen(function* () {
			let ruled = ruledOf(yield* rulings.get(rulingId));
			while (Option.isNone(ruled)) {
				yield* PubSub.take(notices);
				ruled = ruledOf(yield* rulings.get(rulingId));
			}
			return ruled.value;
		});
	return (input: RulingRequest) =>
		Effect.scoped(
			Effect.gen(function* () {
				const notices = yield* feeds.subscribeRulingRefresh();
				const requested = yield* rulings.request(input);
				yield* holds.holding(requested.id);
				const ruled = yield* untilRuled(notices, requested.id);
				yield* rulings.markDelivered(requested.id);
				return ruled;
			}),
		);
});
