import { pending } from "@antumbra/domain-sessions/queries/pending.ts";
import { each } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import { execute } from "#sessions/execution.ts";
export const reconcile = Effect.fn("Sessions.reconcile")(function* () {
	return yield* each(pending, {}, (operation) => operation.id, execute);
});
