import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect } from "effect";
import { archive } from "#commands/archive.ts";
import { archivable } from "#queries/archivable.ts";

export const ARCHIVE_AFTER_MILLIS = 7 * 24 * 60 * 60 * 1000;

export const nextArchive = (settled: typeof archivable.output.Type, now: number): number | undefined => {
	let next: number | undefined;
	for (const held of settled) {
		const at = Date.parse(held.landedAt) + ARCHIVE_AFTER_MILLIS;
		if (at <= now) continue;
		if (next === undefined || at < next) next = at;
	}
	return next;
};

export const archiving = reconciler("archiving", {
	watch: archivable,
	ports: [],
	due: nextArchive,
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
