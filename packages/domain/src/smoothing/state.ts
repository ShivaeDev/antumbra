import { type BoardEntryRow, uncoveredEntries } from "@antumbra/boards";
import type { BoardSmoothing } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { voyagePassesFor } from "#smoothing/attempts.ts";

export interface SmoothingSighting {
	readonly board: ReadonlyArray<BoardEntryRow>;
	readonly pieceBoards: ReadonlyMap<string, ReadonlyArray<BoardEntryRow>>;
	readonly settled: ReadonlyArray<string>;
	readonly voyageId: string;
}

const stateOf = (status: string | undefined): BoardSmoothing["state"] => {
	if (status === undefined || status === "succeeded" || status === "cancelled") {
		return "idle";
	}
	return status === "failed" ? "failed" : "running";
};

const uncoveredIn = (sighting: SmoothingSighting): number =>
	sighting.settled.reduce(
		(total, pieceId) => total + uncoveredEntries(sighting.pieceBoards.get(pieceId) ?? []).length,
		uncoveredEntries(sighting.board).length,
	);

export const makeSmoothingState = Effect.gen(function* () {
	const db = yield* Database;
	return Effect.fnUntraced(function* (sighting: SmoothingSighting) {
		const passes = yield* voyagePassesFor(sighting.voyageId).pipe(Effect.provideService(Database, db));
		return { state: stateOf(passes[0]?.status), uncovered: uncoveredIn(sighting) } satisfies BoardSmoothing;
	});
});
