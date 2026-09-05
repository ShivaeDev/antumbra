import { Boards } from "@antumbra/boards";
import type { AskMoreRequest, ParkRequest } from "@antumbra/contract";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { admiralAsks } from "@antumbra/rulings/holds/admiral-asks";
import { RulingHolds } from "@antumbra/rulings/holds/service";
import { Effect, Option } from "effect";
import { replyFailure } from "#ruling-refusals.ts";
import { notNowWords, questionBackWords } from "#ruling-reply-words.ts";

const askedAt = (ruling: Ruling): string => admiralAsks(ruling).at(-1)?.at.toISOString() ?? ruling.id;

export const makeRulingReplies = Effect.gen(function* () {
	const boards = yield* Boards;
	const holds = yield* RulingHolds;
	const rulings = yield* Rulings;
	const reachAsker = Effect.fnUntraced(function* (ruling: Ruling, sourceRef: string, body: string) {
		const requester = ruling.requester;
		if (requester.kind !== "agent" || (yield* holds.isHeld(ruling.id))) {
			return;
		}
		yield* boards.mail({
			authorAgentId: Option.none(),
			body,
			precedence: "priority",
			sourceRef,
			toAgentId: requester.agentId,
		});
	});
	const askMore = Effect.fn("domain.askMoreOnRuling")(function* (request: AskMoreRequest) {
		const asked = yield* rulings.addContext({ body: request.note, rulingId: request.rulingId });
		yield* reachAsker(asked, `ruling-ask:${asked.id}:${askedAt(asked)}`, questionBackWords(asked, request.note));
		return { rulingId: asked.id };
	});
	const park = Effect.fn("domain.parkRuling")(function* (request: ParkRequest) {
		const parked = yield* rulings.park({ note: request.note, rulingId: request.rulingId });
		yield* reachAsker(parked, `ruling-parked:${parked.id}`, notNowWords(parked, request.note));
		return { rulingId: parked.id };
	});
	return {
		askMore: (request: AskMoreRequest) => askMore(request).pipe(Effect.mapError(replyFailure)),
		park: (request: ParkRequest) => park(request).pipe(Effect.mapError(replyFailure)),
	};
});
