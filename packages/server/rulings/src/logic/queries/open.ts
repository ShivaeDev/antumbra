import type * as Source from "@antumbra/domain-rulings/queries/open.ts";
import { openOrder } from "@antumbra/domain-rulings/queries/order.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const open = Effect.fn("rulings.open")(function* (
	_input: Schema.Struct.Type<typeof Source.open.input>,
): Effect.fn.Return<typeof Source.open.output.Type, never, Records> {
	const rows = yield* Records;

	const all = yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	return all.filter((ruling) => ruling.answer === null).sort(openOrder);
});
