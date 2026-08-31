import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";

export const activeChange = Effect.fn("changes.activeChange")(function* (key: string) {
	const db = yield* Database;
	const stored = yield* db.Change.where({ submissionKey: key }).first();
	return yield* Option.match(stored, {
		onNone: () => Effect.succeed(Option.none()),
		onSome: (row) => Effect.map(changeRow(row), Option.some),
	});
});

export const linkProduces = Effect.fn("changes.linkProduces")(function* (pieceId: string, changeId: string) {
	const db = yield* Database;
	const linked = yield* db.PieceChange.where({ changeId, pieceId }).first();
	if (Option.isSome(linked)) {
		return false;
	}
	yield* db.PieceChange.create({
		changeId,
		pieceId,
		purpose: "produces",
	});
	return true;
});
