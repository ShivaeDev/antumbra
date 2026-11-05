import { pendingOperations } from "@antumbra/domain-agents/queries/pending-operations.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import { Effect } from "effect";
import { execute } from "#sessions/execution.ts";
import { watchKeys } from "#supervision/keys.ts";
export const reconcile = Effect.fn("Sessions.reconcile")(function* () {
	return yield* each({
		keys: watchKeys(pendingOperations.reads, pendingOperations.scope?.({})),
		read: Live.use((live) => live.read(pendingOperations, {})),
		key: (operation) => operation.id,
		act: execute,
	});
});
