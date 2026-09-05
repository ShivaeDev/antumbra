import { Boards } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { rulingAnswerMail } from "#delivery/answer-mail.ts";
import { RulingHolds } from "#holds/service.ts";
import type { Ruling } from "#model.ts";
import { Rulings } from "#rulings.ts";

const deliverOne = Effect.fnUntraced(function* (ruling: Ruling) {
	const answer = ruling.answer;
	const requester = ruling.requester;
	if (Option.isNone(answer) || requester.kind !== "agent") {
		return;
	}
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
		body: rulingAnswerMail(ruling, answer.value),
		precedence: "priority",
		sourceRef: `ruling:${ruling.id}`,
		toAgentId: requester.agentId,
	});
	yield* rulings.markDelivered(ruling.id);
});

export const deliverPending = Effect.fn("RulingDelivery.deliverPending")(function* () {
	const rulings = yield* Rulings;
	const awaiting = yield* rulings.awaitingDelivery();
	yield* Effect.forEach(
		awaiting,
		(ruling) => deliverOne(ruling).pipe(Effect.catchCause((cause) => Effect.logError("a ruling answer could not be delivered", cause))),
		{ discard: true },
	);
});
