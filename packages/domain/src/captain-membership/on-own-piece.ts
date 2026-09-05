import type { Pieces } from "@antumbra/pieces";
import type { DirectToolOutcome } from "@antumbra/plugin-api";
import { type Context, Effect } from "effect";
import { withReadableMembers } from "#captain-membership/with-readable-members.ts";
import { onVoyage, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

export const onOwnPiece = Effect.fn("CaptainMembership.onOwnPiece")(function* (
	identity: SessionIdentity,
	pieceId: string,
	act: (pieceId: string, voyageId: string) => Effect.Effect<DirectToolOutcome>,
): Effect.fn.Return<DirectToolOutcome, never, Context.Service.Identifier<typeof Pieces>> {
	return yield* onVoyage(identity, (voyageId) =>
		withReadableMembers(voyageId, (members) =>
			members.has(pieceId) ? act(pieceId, voyageId) : Effect.succeed(refused("that piece is not on your voyage")),
		),
	);
});
