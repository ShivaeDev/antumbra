import { standing as isStanding } from "@antumbra/domain-rulings/commands/guard.ts";
import type * as Source from "@antumbra/domain-rulings/queries/binding.ts";
import { matches } from "@antumbra/domain-rulings/queries/order.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const binding = Effect.fn("rulings.binding")(function* (
	input: Schema.Struct.Type<typeof Source.binding.input>,
): Effect.fn.Return<typeof Source.binding.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie))
		.filter((item) => isStanding(item) && (item.radius === "fleet" || matches(item, input.subjects)))
		.sort((a, b) => (b.answer?.at ?? "").localeCompare(a.answer?.at ?? ""));
});
