import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import type { RowValue } from "@antumbra/platform-feature/row.ts";
import { Effect, Schema } from "effect";
import { piece } from "#rows/piece.ts";
import { pieceEdge } from "#rows/piece-edge.ts";

export const edges = query("edges", {
	input: { voyageId: VoyageId },
	output: Schema.Array(pieceEdge.Row),
	reads: [piece, pieceEdge],
	run: Effect.fn("pieces.edges")(function* (input, rows) {
		const members = yield* rows.piece.where({ voyageId: input.voyageId });
		const ordered = members.toSorted((left, right) => left.charteredAt.localeCompare(right.charteredAt));
		const wired: RowValue<typeof pieceEdge>[] = [];
		for (const member of ordered) {
			wired.push(...(yield* rows.pieceEdge.where({ to: member.id })));
		}
		return wired;
	}),
});
