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

// Holds are process-local; after restart, the durable ruling answer is delivered through mail instead.
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
				// Subscribe before writing the request so a verdict cannot land before the hold observes its refresh.
				const notices = yield* feeds.subscribeRulingRefresh();
				const requested = yield* rulings.request(input);
				yield* holds.holding(requested.id);
				const ruled = yield* untilRuled(notices, requested.id);
				yield* rulings.markDelivered(requested.id);
				return ruled;
			}),
		);
});
