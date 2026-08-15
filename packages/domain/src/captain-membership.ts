import type { DirectToolOutcome } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { onVoyage, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const withMembers = (
	deps: AgentDeps,
	voyageId: string,
	act: (members: ReadonlySet<string>) => Effect.Effect<DirectToolOutcome>,
): Effect.Effect<DirectToolOutcome> =>
	provideExecutors(deps)(deps.db.VoyagePiece.where({ voyageId }).all()).pipe(
		Effect.matchEffect({
			onFailure: () => Effect.succeed(refused("the voyage could not be read")),
			onSuccess: (rows) => act(new Set(rows.map((row) => row.pieceId))),
		}),
	);

// why: a captain cons one ship. A piece id that names another voyage's work is
// refused rather than acted on, so no captain can reach across a hull by
// guessing an id.
export const onOwnPiece = (
	deps: AgentDeps,
	identity: SessionIdentity,
	pieceId: string,
	act: (pieceId: string) => Effect.Effect<DirectToolOutcome>,
): Effect.Effect<DirectToolOutcome> =>
	onVoyage(identity, (voyageId) =>
		withMembers(deps, voyageId, (members) =>
			members.has(pieceId)
				? act(pieceId)
				: Effect.succeed(refused("that piece is not on your voyage")),
		),
	);

// why: an edge is the other side of the same hull — the model lets any piece
// wait on any piece, and it is the captain's tools that keep a voyage from
// hanging its work off another ship's.
export const onOwnDeps = (
	deps: AgentDeps,
	identity: SessionIdentity,
	dependsOn: ReadonlyArray<string>,
	act: (voyageId: string) => Effect.Effect<DirectToolOutcome>,
): Effect.Effect<DirectToolOutcome> =>
	onVoyage(identity, (voyageId) =>
		withMembers(deps, voyageId, (members) => {
			const strangers = dependsOn.filter((id) => !members.has(id));
			return strangers.length === 0
				? act(voyageId)
				: Effect.succeed(
						refused(
							`these pieces are not on your voyage: ${strangers.join(", ")}`,
						),
					);
		}),
	);
