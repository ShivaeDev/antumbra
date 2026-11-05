import { standing as isStanding } from "@antumbra/domain-rulings/commands/guard.ts";
import { matches } from "@antumbra/domain-rulings/queries/order.ts";
import type * as Source from "@antumbra/domain-rulings/queries/standing.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const standing = Effect.fn("rulings.standing")(function* (
	input: Schema.Struct.Type<typeof Source.standing.input>,
): Effect.fn.Return<typeof Source.standing.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie))
		.filter((item) => isStanding(item) && (input.subjects.length === 0 || matches(item, input.subjects)))
		.sort((a, b) => (b.answer?.at ?? "").localeCompare(a.answer?.at ?? ""));
});
