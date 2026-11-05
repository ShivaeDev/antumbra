import type * as Source from "@antumbra/domain-rulings/queries/open-gates.ts";
import { selection as rulingGateSelection } from "@antumbra/server-storage/records/ruling-gate.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const openGates = Effect.fn("rulings.openGates")(function* (
	input: Schema.Struct.Type<typeof Source.openGates.input>,
): Effect.fn.Return<typeof Source.openGates.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.rulingGate
		.findMany({ where: { open: true }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingGateSelection })
		.pipe(Effect.orDie)).filter((gate) => input.pieceIds === null || input.pieceIds.includes(gate.pieceId));
});
