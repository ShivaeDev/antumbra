import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { heldBerths } from "#held-berths.ts";

export const readBerthSweep = Effect.gen(function* () {
	const db = yield* Database;
	const ready = yield* db.Berth.where({ status: "ready" }).all();
	const stranded = yield* db.Berth.where({ status: "stranded" }).all();
	const changes = (yield* db.Change.all()).map(changeRow);
	const pieceChanges = yield* db.PieceChange.all();
	const repos = yield* db.Repo.all();
	return {
		held: heldBerths([...ready, ...stranded], changes, repos, pieceChanges),
		ready,
		stranded,
	};
});
