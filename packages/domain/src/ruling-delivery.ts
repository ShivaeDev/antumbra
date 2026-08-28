import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Effect, Layer, Option, Stream } from "effect";
import { rulingAnswerMail } from "#ruling-answer-mail.ts";

const guarded = <A, R>(act: Effect.Effect<A, unknown, R>, said: string) =>
	act.pipe(Effect.catchCause((cause) => Effect.logError(said, cause)));

// why: the mailbox deduplicates by source reference, so the send is safe to
// repeat and the mark may lag it. A crash between the two costs one replayed
// send that lands on the entry already there, never a second answer.
const deliverOne = (ruling: Ruling) =>
	Effect.gen(function* () {
		const answer = ruling.answer;
		if (Option.isNone(answer)) {
			return;
		}
		const boards = yield* Boards;
		const rulings = yield* Rulings;
		yield* boards.mail({
			authorAgentId: Option.none(),
			body: rulingAnswerMail(ruling, answer.value),
			precedence: "priority",
			sourceRef: `ruling:${ruling.id}`,
			toAgentId: ruling.requesterAgentId,
		});
		yield* rulings.markDelivered(ruling.id);
	});

const onePass = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const awaiting = yield* rulings.awaitingDelivery();
	yield* Effect.forEach(
		awaiting,
		(ruling) =>
			guarded(deliverOne(ruling), "a ruling answer could not be delivered"),
		{ discard: true },
	);
});

// why: who rules is not who delivers. The answer owes the asker one mail, and
// that debt is read off the record every pass, so an answer given by a window,
// a captain, or a test all reach the asker by the same durable road.
export const RulingDeliveryLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		// why: subscribed before the first read, so an answer landing between the
		// read and the subscription is delivered on the next ring rather than
		// waiting for one that never comes.
		const notices = yield* feeds.subscribeRulingRefresh();
		const pass = guarded(onePass, "the ruling delivery pass failed");
		yield* Effect.forkScoped(
			pass.pipe(
				Effect.andThen(
					Stream.fromSubscription(notices).pipe(Stream.runForEach(() => pass)),
				),
			),
		);
	}),
);
