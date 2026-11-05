import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { migration } from "#v1/migration.ts";

export const operationRetried = fact("SessionOperationRetried", { previousId: SessionOperationId, operation: sessionOperation.Row });
export const gatedOperations = migration(2, {
	fact: operationRetried.name,
	rewrite: (stored) => {
		const operation = stored.payload.operation;
		if (typeof operation !== "object" || operation === null) return Effect.succeed(stored);
		return Effect.succeed({ ...stored, payload: { ...stored.payload, operation: { gatedBy: null, ...operation } } });
	},
});
