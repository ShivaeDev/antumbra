import { pending } from "@antumbra/domain-lifecycle/queries/pending.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Lifecycle } from "@antumbra/server-lifecycle/service.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Effect } from "effect";
import { honorRestart } from "#lifecycle/honor-restart.ts";
import { watchKeys } from "#supervision/keys.ts";

export const reconcile = Effect.fn("Lifecycle.reconcile")(function* () {
	const lifecycleService = yield* Lifecycle;

	let refused = false;
	return yield* run({
		keys: watchKeys(pending.reads, pending.scope?.({})),
		read: lifecycleService.pending({}).pipe(Effect.orDie),
		act: (sessions) => {
			refused = false;
			return (sessions === null ? Effect.void : honorRestart({ requestId: Id.make() })).pipe(
				Effect.catchTag("LifecycleRefused", (failure) =>
					Effect.sync(() => {
						refused = true;
					}).pipe(Effect.andThen(Effect.logError("a restart wake was refused", failure))),
				),
			);
		},
		due: (_reading, now) => (refused ? now + 60_000 : undefined),
	});
});
