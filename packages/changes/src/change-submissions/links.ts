import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";

export const activeChange = (key: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const stored = yield* db.Change.where({ submissionKey: key }).first();
		return yield* Option.match(stored, {
			onNone: () => Effect.succeed(Option.none()),
			onSome: (row) => Effect.map(changeRow(row), Option.some),
		});
	});

export const linkProduces = (pieceId: string, changeId: string) =>
	Effect.gen(function* () {
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
