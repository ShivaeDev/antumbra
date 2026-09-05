import type { AskMoreRequest, ParkRequest } from "@antumbra/contract";
import { RulingReplies } from "@antumbra/rulings/replies/service";
import { Effect } from "effect";
import { replyFailure } from "#ruling-refusals.ts";

export const makeRulingReplies = Effect.gen(function* () {
	const replies = yield* RulingReplies;
	return {
		askMore: (request: AskMoreRequest) =>
			replies.askMore(request).pipe(
				Effect.map((ruling) => ({ rulingId: ruling.id })),
				Effect.mapError(replyFailure),
			),
		park: (request: ParkRequest) =>
			replies.park(request).pipe(
				Effect.map((ruling) => ({ rulingId: ruling.id })),
				Effect.mapError(replyFailure),
			),
	};
});
