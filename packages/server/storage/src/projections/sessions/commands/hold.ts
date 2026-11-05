import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation as sessionOperationRecordSchema } from "@antumbra/domain-sessions/rows/session-operation.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const operationHeld = fact("SessionOperationHeld", { id: SessionOperationId, detail: Schema.String, backend: Schema.NullOr(Schema.String) });
export const operationHeldMaterializer = Effect.fn("Sessions.operationHeld")(function* (
	fact: FactValue<typeof operationHeld>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const operation = yield* rows.sessionOperation
		.findById(fact.id)
		.pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionOperationRecordSchema.Row)), Effect.orDie);
	if (operation.status !== "requested" && operation.status !== "waiting") return;
	yield* rows.sessionOperation.updateVoid({ ...{ status: "waiting", detail: fact.detail }, id: fact.id }).pipe(Effect.orDie);
	if (fact.backend !== null) yield* rows.sessionCapacityWait.insertVoid({ id: fact.id, backend: fact.backend }).pipe(Effect.orDie);
});
