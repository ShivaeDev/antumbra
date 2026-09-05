import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { dismissedChangeIdsFor } from "#change-verdicts.ts";

export const pendingForPieces = Effect.fn("Changes.pendingForPieces")(function* (pieceIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const links = yield* db.PieceChange.where((link) => link.pieceId.in(pieceIds)).all();
	const candidates = yield* db.Change.where((change) => change.id.in(links.map((link) => link.changeId)))
		.where((change) => change.stage.neq("landed"))
		.orderBy((change) => change.createdAt.asc())
		.all();
	const dismissedChangeIds = yield* dismissedChangeIdsFor(candidates.map((change) => change.id));
	const changes = yield* Effect.forEach(
		candidates.filter((change) => !dismissedChangeIds.has(change.id)),
		changeRow,
	);
	const changeIds = new Set(changes.map((change) => change.id));
	return {
		changes,
		dismissedChangeIds,
		pieceChanges: yield* Effect.forEach(
			links.filter((link) => changeIds.has(link.changeId)),
			pieceChangeRow,
		),
	};
});
