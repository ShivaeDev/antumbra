import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { piece } from "#rows/piece.ts";
import { pieceProgress } from "#rows/piece-progress.ts";

export const ready = query("ready", {
	input: {},
	output: Schema.Array(Schema.Struct({ piece: piece.Row, voyage: voyage.Row })),
	reads: [piece, pieceProgress, voyage],
	run: Effect.fn("Pieces.ready")(function* (_input, rows) {
		const candidates = yield* rows.pieceProgress.where({ state: "ready" });
		const ready = yield* Effect.forEach(candidates, (candidate) =>
			Effect.all({ piece: rows.piece.get(candidate.id), voyage: rows.voyage.get(candidate.voyageId) }),
		);
		return ready.toSorted(
			(a, b) =>
				Number(b.voyage.focusedAt !== null) - Number(a.voyage.focusedAt !== null) ||
				(a.piece.launchedAt ?? "").localeCompare(b.piece.launchedAt ?? "") ||
				a.piece.id.localeCompare(b.piece.id),
		);
	}),
});
