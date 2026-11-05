import type { inputRetried } from "@antumbra/domain-inputs/facts/retried.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const retried = Effect.fn("inputs.InputRetried")(function* (fact: FactValue<typeof inputRetried>): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.sessionInput.updateVoid({ ...{ status: "pending", detail: null }, id: fact.id }).pipe(Effect.orDie);
	const previous = yield* rows.sessionOperation
		.findMany({ where: { inputId: fact.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	for (const operation of previous) {
		if (operation.status === "waiting") yield* rows.sessionOperation.updateVoid({ ...{ status: "cancelled" }, id: operation.id }).pipe(Effect.orDie);
	}
	yield* rows.sessionOperation
		.insertVoid({
			id: fact.operationId,
			sessionId: fact.sessionId,
			inputId: fact.id,
			kind: fact.deliveryKind,
			reason: "",
			status: "requested",
			detail: null,
			requestedAt: new Date(fact.at).toISOString(),
			sequence: fact.seq,
			gatedBy: null,
		})
		.pipe(Effect.orDie);
});
