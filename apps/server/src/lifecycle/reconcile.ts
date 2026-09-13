import { pending } from "@antumbra/domain-lifecycle/queries/pending.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { run } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import { honorRestart } from "#lifecycle/honor-restart.ts";

export const reconcile = Effect.fn("Lifecycle.reconcile")(function* () {
	return yield* run(pending, {}, (sessions) => (sessions === null ? Effect.void : honorRestart({ requestId: Id.make() })));
});
