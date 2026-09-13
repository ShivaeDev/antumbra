import { pendingOperations } from "@antumbra/domain-agents/queries/pending-operations.ts";
import { each } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import { execute } from "#sessions/execution.ts";
export const reconcile = Effect.fn("Sessions.reconcile")(function* () {
	return yield* each(pendingOperations, {}, (operation) => operation.id, execute);
});
