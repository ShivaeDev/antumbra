import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const memberPieceIds = (voyageId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.VoyagePiece.where({ voyageId }).all();
		const members: ReadonlySet<string> = new Set(
			rows.map((row) => row.pieceId),
		);
		return members;
	});
