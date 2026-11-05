import type { inputObserved } from "@antumbra/domain-inputs/facts/observed.ts";
import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Effect, Option, Schema } from "effect";
import { Records } from "#records.ts";

const inputId = Schema.decodeUnknownOption(SessionInputId);
export const observed = Effect.fn("inputs.InputDeliveryObserved")(function* (
	fact: FactValue<typeof inputObserved>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const id = inputId(fact.inputId);
	if (Option.isNone(id)) return;
	const held = yield* rows.sessionInput
		.findOne({ where: { id: id.value }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held) || held.value.sessionId !== fact.sessionId || held.value.status === "accepted" || held.value.status === "ambiguous") return;
	const operation = yield* rows.sessionOperation
		.findOne({
			where: { id: SessionOperationId.make(fact.operationId) },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionOperationSelection,
		})
		.pipe(Effect.orDie);
	if (
		Option.isNone(operation) ||
		operation.value.status === "cancelled" ||
		operation.value.inputId !== id.value ||
		operation.value.sessionId !== fact.sessionId
	)
		return;
	yield* rows.sessionInput.updateVoid({ ...{ status: fact.status, detail: fact.detail }, id: id.value }).pipe(Effect.orDie);
});
