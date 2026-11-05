import type * as Source from "@antumbra/domain-agents/queries/by-piece.ts";
import { selection as agentReadingSelection } from "@antumbra/server-storage/records/agent-reading.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const byPiece = Effect.fn("Agents.byPiece")(function* (
	input: Schema.Struct.Type<typeof Source.byPiece.input>,
): Effect.fn.Return<typeof Source.byPiece.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.agentReading
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentReadingSelection })
		.pipe(Effect.orDie)).filter((held) => held.pieceIds.includes(input.pieceId));
});
