import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { type Ruling, type RulingAnswer, RulingHolds, Rulings } from "@antumbra/rulings";
import { Effect, Layer, Option, Stream } from "effect";
import { rulingAnswerMail } from "#ruling-answer-mail.ts";

const guarded = <A, R>(act: Effect.Effect<A, unknown, R>, said: string) => act.pipe(Effect.catchCause((cause) => Effect.logError(said, cause)));

const mailAndMark = (ruling: Ruling, answer: RulingAnswer, toAgentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const boards = yield* Boards;
		const holds = yield* RulingHolds;
		const rulings = yield* Rulings;
		const row = yield* db.Ruling.where({ id: ruling.id }).first();
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

const deliverOne = (ruling: Ruling) =>
	Effect.gen(function* () {
		const answer = ruling.answer;
		const requester = ruling.requester;
		if (Option.isNone(answer) || requester.kind !== "agent") {
			return;
		}
		yield* mailAndMark(ruling, answer.value, requester.agentId);
	});

const onePass = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const awaiting = yield* rulings.awaitingDelivery();
	yield* Effect.forEach(awaiting, (ruling) => guarded(deliverOne(ruling), "a ruling answer could not be delivered"), { discard: true });
});

export const RulingDeliveryLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const notices = yield* feeds.subscribeRulingRefresh();
		const pass = guarded(onePass, "the ruling delivery pass failed");
		yield* Effect.forkScoped(pass.pipe(Effect.andThen(Stream.fromSubscription(notices).pipe(Stream.runForEach(() => pass)))));
	}),
);
