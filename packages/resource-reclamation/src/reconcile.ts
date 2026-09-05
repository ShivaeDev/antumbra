import { Effect } from "effect";
import { runResourceReclaimPass } from "#resource-reclaim-pass.ts";

export const reconcile = Effect.fn("ResourceReconciler.reconcile")(function* () {
	yield* runResourceReclaimPass.pipe(
		Effect.catchCause((cause) => Effect.logWarning("resource reclaim pass held uncertain durable truth", { failure: String(cause) })),
	);
});
