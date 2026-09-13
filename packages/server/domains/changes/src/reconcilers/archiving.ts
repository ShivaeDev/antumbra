import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect } from "effect";
import { archive } from "#commands/archive.ts";
import { archivable } from "#queries/archivable.ts";

const ARCHIVE_AFTER_MILLIS = 7 * 24 * 60 * 60 * 1000;

export const archiving = reconciler("archiving", {
	watch: archivable,
	ports: [],
	run: Effect.fn("changes.archiving")(function* (settled, reconciling) {
		const now = yield* Clock.currentTimeMillis;
		for (const held of settled) {
			if (now - Date.parse(held.landedAt) < ARCHIVE_AFTER_MILLIS) continue;
			yield* reconciling
				.commit(archive, { changeId: held.id, requestId: Request.make(`archive:${held.id}`) })
				.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, ChangeStillOpen: () => Effect.void, UnknownChange: () => Effect.void }));
		}
	}),
});
