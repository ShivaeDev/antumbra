import type { Pieces } from "@antumbra/pieces";
import type { DirectToolOutcome } from "@antumbra/plugin-api";
import { type Context, Effect } from "effect";
import { withReadableMembers } from "#captain-membership/with-readable-members.ts";
import { onVoyage, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const onOwnedDependencies = (
	members: ReadonlySet<string>,
	dependsOn: ReadonlyArray<string>,
	voyageId: string,
	act: (voyageId: string) => Effect.Effect<DirectToolOutcome>,
) => {
	const strangers = dependsOn.filter((id) => !members.has(id));
	return strangers.length === 0
		? act(voyageId)
		: Effect.succeed(
				refused(`these pieces are not on your voyage: ${strangers.join(", ")}`),
			);
};

// why: an edge is the other side of the same hull — the model lets any piece
// wait on any piece, and this capability keeps a voyage from hanging its work
// off another ship's.
export const onOwnDeps = Effect.fn("captainMembership.onOwnDeps")(function* (
	identity: SessionIdentity,
	dependsOn: ReadonlyArray<string>,
	act: (voyageId: string) => Effect.Effect<DirectToolOutcome>,
): Effect.fn.Return<
	DirectToolOutcome,
	never,
	Context.Service.Identifier<typeof Pieces>
> {
	return yield* onVoyage(identity, (voyageId) =>
		withReadableMembers(voyageId, (members) =>
			onOwnedDependencies(members, dependsOn, voyageId, act),
		),
	);
});
