import type { BoardScope } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";

export type BoardScopeName = "piece" | "self" | "voyage";

const voyageOfPiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.VoyagePiece.where({ pieceId })
			.first()
			.pipe(
				Effect.map((row) =>
					Option.map(
						row,
						(membership): BoardScope => ({
							kind: "voyage",
							voyageId: membership.voyageId,
						}),
					),
				),
			);
	});

// why: a captain carries its voyage; crew reach the same board through the
// piece they answer to, because membership is the link and nothing has to be
// told to a session that the rows do not already say.
const voyageScope = (identity: SessionIdentity) => {
	if (Option.isSome(identity.voyageId)) {
		return Effect.succeed(
			Option.some<BoardScope>({
				kind: "voyage",
				voyageId: identity.voyageId.value,
			}),
		);
	}
	return Option.match(identity.pieceId, {
		onNone: () => Effect.succeed(Option.none<BoardScope>()),
		onSome: voyageOfPiece,
	});
};

export const resolveBoardScope = (
	identity: SessionIdentity,
	name: BoardScopeName,
) => {
	if (name === "self") {
		return Effect.succeed(
			Option.some<BoardScope>({ agentId: identity.agentId, kind: "agent" }),
		);
	}
	if (name === "piece") {
		return Effect.succeed(
			Option.map(
				identity.pieceId,
				(pieceId): BoardScope => ({ kind: "piece", pieceId }),
			),
		);
	}
	return voyageScope(identity);
};
