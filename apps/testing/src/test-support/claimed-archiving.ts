import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Changes } from "@antumbra/server-changes/service.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import { Deferred, Effect, Queue } from "effect";

export const claimedArchiving = Effect.fn("PostgresApp.claimedArchiving")(function* () {
	const changes = yield* Changes;
	const entered = yield* Queue.make<string>();
	const interrupted = yield* Queue.make<string>();
	const release = yield* Deferred.make<void>();
	yield* each({
		keys: [{ _tag: "List", collection: "change" }],
		read: changes.archivable({}),
		key: (change) => change.id,
		act: (change) =>
			Effect.gen(function* () {
				yield* Queue.offer(entered, change.id);
				yield* Deferred.await(release);
				yield* changes.archive({ changeId: change.id, requestId: Request.make(`archive:${change.id}`) });
			}).pipe(Effect.onInterrupt(() => Queue.offer(interrupted, change.id))),
	});
	return { entered: Queue.take(entered), interrupted: Queue.take(interrupted), release: Deferred.succeed(release, undefined) };
});
