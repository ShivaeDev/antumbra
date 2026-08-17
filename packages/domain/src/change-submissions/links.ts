import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";

export const activeChange = (key: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.Change.where({ submissionKey: key })
			.first()
			.pipe(Effect.map(Option.map(changeRow)));
	});

export const linkProduces = (pieceId: string, changeId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const linked = yield* db.PieceChange.where({ changeId, pieceId }).first();
		if (Option.isSome(linked)) {
			return;
		}
		yield* db.PieceChange.create({
			changeId,
			pieceId,
			purpose: "produces",
		});
	});
