import type * as Source from "@antumbra/domain-inputs/queries/delivery.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const deliveryReading = Effect.fn("inputs.deliveryReading")(function* (
	input: Schema.Struct.Type<typeof Source.deliveryReading.input>,
): Effect.fn.Return<typeof Source.deliveryReading.output.Type, never, Records> {
	const rows = yield* Records;

	const operations = yield* rows.sessionOperation
		.findMany({ where: { inputId: input.inputId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	const latest = operations
		.filter((operation) => operation.status !== "cancelled")
		.sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
	return {
		input: Option.getOrNull(
			yield* rows.sessionInput
				.findOne({ where: { id: input.inputId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
				.pipe(Effect.orDie),
		),
		operation: latest ?? null,
	};
});
