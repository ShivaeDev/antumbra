import type * as Source from "@antumbra/domain-rulings/queries/frontier.ts";
import { openOrder } from "@antumbra/domain-rulings/queries/order.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const frontier = Effect.fn("rulings.frontier")(function* (
	input: Schema.Struct.Type<typeof Source.frontier.input>,
): Effect.fn.Return<typeof Source.frontier.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie))
		.filter(
			(item) =>
				item.answer === null &&
				item.parked === null &&
				item.requester.kind === "agent" &&
				item.subjects.some((subject) => subject.kind === "voyage" && subject.id === input.voyageId),
		)
		.sort(openOrder);
});
