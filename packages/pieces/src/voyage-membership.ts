import {
	Database,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import { type Context, Effect } from "effect";

export const memberPieceIds = Effect.fn("pieces.memberPieceIds")(function* (
	voyageId: string,
): Effect.fn.Return<
	ReadonlySet<string>,
	PrismaError,
	Context.Service.Identifier<typeof Database> | WriteExecutors
> {
	const db = yield* Database;
	const rows = yield* db.VoyagePiece.where({ voyageId }).all();
	const members: ReadonlySet<string> = new Set(rows.map((row) => row.pieceId));
	return members;
});
