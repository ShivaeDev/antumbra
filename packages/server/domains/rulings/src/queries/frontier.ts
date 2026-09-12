import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { openOrder } from "#queries/order.ts";
import { ruling } from "#rows/ruling.ts";
export const frontier = query("frontier", {
	input: { voyageId: VoyageId },
	output: Schema.Array(ruling.Row),
	reads: [ruling],
	run: Effect.fn("rulings.frontier")(function* (input, rows) {
		return (yield* rows.ruling.where({}))
			.filter(
				(item) =>
					item.answer === null &&
					item.parked === null &&
					item.requester.kind === "agent" &&
					item.subjects.some((subject) => subject.kind === "voyage" && subject.id === input.voyageId),
			)
			.sort(openOrder);
	}),
});
