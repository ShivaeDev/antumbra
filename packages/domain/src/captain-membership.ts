import { Database, type WriteExecutors } from "@antumbra/persistence";
import type { DirectToolOutcome } from "@antumbra/plugin-api";
import { Context, Effect, Layer } from "effect";
import { onVoyage, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

export class CaptainMembership extends Context.Service<
	CaptainMembership,
	{
		readonly onOwnDeps: (
			identity: SessionIdentity,
			dependsOn: ReadonlyArray<string>,
			act: (voyageId: string) => Effect.Effect<DirectToolOutcome>,
		) => Effect.Effect<DirectToolOutcome>;
		readonly onOwnPiece: (
			identity: SessionIdentity,
			pieceId: string,
			act: (pieceId: string) => Effect.Effect<DirectToolOutcome>,
		) => Effect.Effect<DirectToolOutcome>;
	}
>()("@antumbra/domain/CaptainMembership") {}

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

export const CaptainMembershipLive = Layer.effect(CaptainMembership)(
	Effect.gen(function* () {
		const db = yield* Database;
		const executors = yield* Effect.context<WriteExecutors>();
		const withMembers = (
			voyageId: string,
			act: (members: ReadonlySet<string>) => Effect.Effect<DirectToolOutcome>,
		): Effect.Effect<DirectToolOutcome> =>
			db.VoyagePiece.where({ voyageId })
				.all()
				.pipe(
					Effect.provideContext(executors),
					Effect.matchEffect({
						onFailure: () =>
							Effect.succeed(refused("the voyage could not be read")),
						onSuccess: (rows) => act(new Set(rows.map((row) => row.pieceId))),
					}),
				);
		return CaptainMembership.of({
			// why: an edge is the other side of the same hull — the model lets any
			// piece wait on any piece, and this capability keeps a voyage from
			// hanging its work off another ship's.
			onOwnDeps: (identity, dependsOn, act) =>
				onVoyage(identity, (voyageId) =>
					withMembers(voyageId, (members) =>
						onOwnedDependencies(members, dependsOn, voyageId, act),
					),
				),
			// why: a captain cons one ship. A piece id naming another voyage's
			// work is refused rather than acted on, so guessed ids grant no reach.
			onOwnPiece: (identity, pieceId, act) =>
				onVoyage(identity, (voyageId) =>
					withMembers(voyageId, (members) =>
						members.has(pieceId)
							? act(pieceId)
							: Effect.succeed(refused("that piece is not on your voyage")),
					),
				),
		});
	}),
);
