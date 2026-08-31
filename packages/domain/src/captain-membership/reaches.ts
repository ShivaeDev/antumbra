import { Pieces } from "@antumbra/pieces";
import { type Context, Effect, Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";

export const reaches = Effect.fn("captainMembership.reaches")(function* (
	identity: SessionIdentity,
	pieceIds: ReadonlyArray<string>,
): Effect.fn.Return<boolean, never, Context.Service.Identifier<typeof Pieces>> {
	return yield* Option.match(identity.voyageId, {
		onNone: () => Effect.succeed(false),
		onSome: (voyageId) =>
			Effect.flatMap(Pieces, (pieces) => pieces.membersOfVoyage(voyageId)).pipe(
				Effect.map((owned) => pieceIds.some((id) => owned.has(id))),
				Effect.orElseSucceed(() => false),
			),
	});
});
