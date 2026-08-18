import { Database } from "@antumbra/persistence";
import { decodeStoredBerthStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { heldBerths } from "#held-berths.ts";

export const readBerthSweep = Effect.gen(function* () {
	const db = yield* Database;
	const berths = yield* Effect.forEach(yield* db.Berth.all(), (berth) =>
		Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)).pipe(
			Effect.map((status) => ({ ...berth, status })),
		),
	);
	const ready = berths.filter((berth) => berth.status === "ready");
	const stranded = berths.filter((berth) => berth.status === "stranded");
	const storedChanges = yield* db.Change.all();
	const storedPieceChanges = yield* db.PieceChange.all();
	const changes = yield* Effect.forEach(storedChanges, changeRow);
	const pieceChanges = yield* Effect.forEach(
		storedPieceChanges,
		pieceChangeRow,
	);
	const repos = yield* db.Repo.all();
	const held = new Map(
		heldBerths([...ready, ...stranded], changes, repos, pieceChanges),
	);
	return {
		held,
		ready,
		stranded,
	};
});
