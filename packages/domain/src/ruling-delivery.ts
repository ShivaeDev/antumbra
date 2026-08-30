import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { type Ruling, type RulingAnswer, Rulings } from "@antumbra/rulings";
import { Effect, Layer, Option, Stream } from "effect";
import { rulingAnswerMail } from "#ruling-answer-mail.ts";
import { RulingHolds } from "#ruling-holds.ts";

const guarded = <A, R>(act: Effect.Effect<A, unknown, R>, said: string) => act.pipe(Effect.catchCause((cause) => Effect.logError(said, cause)));

// why: the mailbox deduplicates by source reference, so the send is safe to
// repeat and the mark may lag it. The send and the mark are one transaction:
// they take their turn behind a verdict landing beside them instead of
// committing into the middle of it, and a pass that overlaps another finds
// the mark already set and sends nothing. The hold is read inside that same
// turn, after the verdict it would answer has already committed: an asker
// still on the line owns its own answer, and a hold that died leaves the
// ruling undelivered for the next pass to mail exactly once.
const mailAndMark = (ruling: Ruling, answer: RulingAnswer, toAgentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const boards = yield* Boards;
		const holds = yield* RulingHolds;
		const rulings = yield* Rulings;
		const row = yield* db.Ruling.where({ id: ruling.id }).select("deliveredAt").first();
		if (Option.isNone(row) || row.value.deliveredAt !== null) {
			return;
		}
		if (yield* holds.isHeld(ruling.id)) {
			return;
		}
		yield* boards.mail({
			authorAgentId: Option.none(),
			body: rulingAnswerMail(ruling, answer),
			precedence: "priority",
			sourceRef: `ruling:${ruling.id}`,
			toAgentId,
		});
		yield* rulings.markDelivered(ruling.id);
	});

// why: a ruling an authority proclaimed for itself owes no mail — the asker
// and the answer are the same hand, and no agent is waiting on the road back.
const deliverOne = (ruling: Ruling) =>
	Effect.gen(function* () {
		const answer = ruling.answer;
		const requester = ruling.requester;
		if (Option.isNone(answer) || requester.kind !== "agent") {
			return;
		}
		const db = yield* Database;
		yield* db.transaction(mailAndMark(ruling, answer.value, requester.agentId));
	});

const onePass = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const awaiting = yield* rulings.awaitingDelivery();
	yield* Effect.forEach(awaiting, (ruling) => guarded(deliverOne(ruling), "a ruling answer could not be delivered"), { discard: true });
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
		yield* Effect.forkScoped(pass.pipe(Effect.andThen(Stream.fromSubscription(notices).pipe(Stream.runForEach(() => pass)))));
	}),
);
