import { Pieces } from "@antumbra/pieces";
import type { DirectToolOutcome } from "@antumbra/plugin-api";
import { type Context, Effect } from "effect";
import { refused } from "#tool-answers.ts";

export const withReadableMembers = Effect.fn(
	"captainMembership.withReadableMembers",
)(function* (
	voyageId: string,
	act: (members: ReadonlySet<string>) => Effect.Effect<DirectToolOutcome>,
): Effect.fn.Return<
	DirectToolOutcome,
	never,
	Context.Service.Identifier<typeof Pieces>
> {
	const pieces = yield* Pieces;
	return yield* pieces.membersOfVoyage(voyageId).pipe(
		Effect.matchEffect({
			onFailure: () => Effect.succeed(refused("the voyage could not be read")),
			onSuccess: act,
		}),
	);
});
