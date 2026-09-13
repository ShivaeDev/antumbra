import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect } from "effect";
import { archive } from "#commands/archive.ts";
import { all } from "#queries/all.ts";
import { dueArchives } from "#queries/due-archives.ts";

export const archiving = reconciler("archiving", {
	watch: all,
	ports: [],
	run: Effect.fn("changes.archiving")(function* (_reading, reconciling) {
		const now = yield* Clock.currentTimeMillis;
		for (const held of yield* reconciling.read(dueArchives, { now })) {
			yield* reconciling
				.commit(archive, { changeId: held.id, requestId: Request.make(`archive:${held.id}`) })
				.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, ChangeStillOpen: () => Effect.void, UnknownChange: () => Effect.void }));
		}
	}),
});
