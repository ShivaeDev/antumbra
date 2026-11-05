import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const operationRetried = fact("SessionOperationRetried", { previousId: SessionOperationId, operation: sessionOperation.Row });
export const operationRetriedMaterializer = Effect.fn("Sessions.operationRetried")(function* (
	fact: FactValue<typeof operationRetried>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.sessionOperation.updateVoid({ ...{ status: "cancelled" }, id: fact.previousId }).pipe(Effect.orDie);
	yield* rows.sessionOperation.insertVoid({ ...fact.operation, requestedAt: new Date(fact.at).toISOString(), sequence: fact.seq }).pipe(Effect.orDie);
});
