import type { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { byId as pieceById } from "@antumbra/domain-pieces/queries/by-id.ts";
import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { request } from "@antumbra/domain-starts/commands/request.ts";
import { StartFailure } from "@antumbra/domain-starts/commands/submit.ts";
import { byId as voyageById } from "@antumbra/domain-voyages/queries/by-id.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { charter } from "#starts/charter.ts";
import { binding, identity } from "#starts/request.ts";

export const workNow = Effect.fn("Starts.workNow")(function* (input: { requestId: Request; pieceId: PieceId }) {
	const live = yield* Live;
	const commit = yield* Commit;
	const piece = yield* live.read(pieceById, { id: input.pieceId });
	if (piece === null) return yield* new StartFailure({ message: "Piece not found" });
	const voyage = yield* live.read(voyageById, { id: piece.voyageId });
	if (voyage === null) return yield* new StartFailure({ message: "Voyage not found" });
	const ids = identity(input.requestId);
	const settings = yield* live.read(resolve, { voyageId: voyage.id, role: "crew" });
	const tools = yield* binding({ ...ids, voyageId: voyage.id, pieceId: piece.id, role: piece.role });
	yield* commit
		.commit(request, {
			requestId: input.requestId,
			...ids,
			...settings,
			...tools,
			voyageId: voyage.id,
			pieceId: piece.id,
			source: "work-now",
			role: piece.role,
			charter: yield* charter(ids.agentId, voyage, piece),
		})
		.pipe(
			Effect.catchTag("AlreadyDone", () => Effect.void),
			Effect.mapError((failure) => new StartFailure({ message: failure._tag })),
		);
	return { requestId: input.requestId, agentId: ids.agentId };
});
