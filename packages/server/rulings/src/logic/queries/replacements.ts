import { standing } from "@antumbra/domain-rulings/commands/guard.ts";
import type * as Source from "@antumbra/domain-rulings/queries/replacements.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const replacements = Effect.fn("rulings.replacements")(function* (
	input: Schema.Struct.Type<typeof Source.replacements.input>,
): Effect.fn.Return<typeof Source.replacements.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie)).filter((item) => item.id !== input.rulingId && standing(item));
});
