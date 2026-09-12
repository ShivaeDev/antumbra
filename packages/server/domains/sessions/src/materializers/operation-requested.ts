import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { operationRequested } from "#facts/operation-requested.ts";
import { sessionOperation } from "#rows/session-operation.ts";
export const operationRequestedMaterializer = materializer(operationRequested, {
	writes: [sessionOperation],
	run: Effect.fn("sessions.operationRequested")(function* (fact, rows) {
		const { id, sessionId, kind, inputId, reason, status, detail, requestedAt } = fact;
		yield* rows.sessionOperation.insert({ id, sessionId, kind, inputId, reason, status, detail, requestedAt });
	}),
});
