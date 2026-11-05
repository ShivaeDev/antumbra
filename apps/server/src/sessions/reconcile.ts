import { pendingOperations } from "@antumbra/domain-agents/queries/pending-operations.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import { Effect } from "effect";
import { execute } from "#sessions/execution.ts";
import { watchKeys } from "#supervision/keys.ts";
export const reconcile = Effect.fn("Sessions.reconcile")(function* () {
	const agentsService = yield* Agents;

	return yield* each({
		keys: watchKeys(pendingOperations.reads, pendingOperations.scope?.({})),
		read: agentsService.pendingOperations({}).pipe(Effect.orDie),
		key: (operation) => operation.id,
		act: execute,
	});
});
