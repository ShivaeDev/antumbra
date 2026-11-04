import { archivable } from "@antumbra/domain-changes/queries/archivable.ts";
import { ARCHIVE_AFTER_MILLIS, nextArchive } from "@antumbra/domain-changes/reconcilers/archiving.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Changes } from "@antumbra/server-changes/service.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Clock, Effect } from "effect";
import { watchKeys } from "#supervision/keys.ts";

export const archiving = Effect.fn("Changes.archiving")(function* () {
	const changes = yield* Changes;
	return yield* run({
		keys: watchKeys(archivable.reads, undefined),
		read: changes.archivable({}),
		due: nextArchive,
		act: Effect.fn("Changes.archiveDue")(function* (settled) {
			const now = yield* Clock.currentTimeMillis;
			for (const held of settled) {
				if (now - Date.parse(held.landedAt) < ARCHIVE_AFTER_MILLIS) continue;
				yield* changes
					.archive({ changeId: held.id, requestId: Request.make(`archive:${held.id}`) })
					.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, ChangeStillOpen: () => Effect.void, UnknownChange: () => Effect.void }));
			}
		}),
	});
});
