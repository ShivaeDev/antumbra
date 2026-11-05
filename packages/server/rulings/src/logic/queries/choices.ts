import type * as Source from "@antumbra/domain-rulings/queries/choices.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const choices = Effect.fn("rulings.choices")(function* (
	input: Schema.Struct.Type<typeof Source.choices.input>,
): Effect.fn.Return<typeof Source.choices.output.Type, never, Records> {
	const rows = yield* Records;

	const found = yield* rows.ruling
		.findOne({ where: { id: input.rulingId }, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return [];
	const current = found.value;
	return [...current.choices].sort(
		(a, b) => Number(b.id === current.recommendation?.choiceId) - Number(a.id === current.recommendation?.choiceId) || a.position - b.position,
	);
});
