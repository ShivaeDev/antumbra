import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { restartRecorded } from "#facts/restart-recorded.ts";
import { RESTART } from "#ids.ts";
import { restart } from "#rows/restart.ts";
export const restartRecordedMaterializer = materializer(restartRecorded, {
	writes: [restart],
	run: Effect.fn("Lifecycle.RestartRecorded")(function* (fact, rows) {
		if (yield* rows.restart.exists(RESTART)) yield* rows.restart.update(RESTART, { sessionIds: fact.sessionIds });
		else yield* rows.restart.insert({ id: RESTART, sessionIds: fact.sessionIds });
	}),
});
