import { each } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import { execute } from "#execution.ts";
import { pending } from "#queries/pending.ts";
export const reconcile = Effect.fn("Sessions.reconcile")(function* () {
	return yield* each(pending, {}, (operation) => operation.id, execute);
});
