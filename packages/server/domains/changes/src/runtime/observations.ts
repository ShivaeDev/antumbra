import type { Observation } from "@antumbra/platform-change-host/schema.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Clock, Effect } from "effect";
import { observe } from "#commands/observe.ts";
import type { Attachment } from "#observation.ts";
export const recordObservation = Effect.fn("changes.recordObservation")(function* (
	host: string,
	observation: Observation,
	attachment: Attachment = { _tag: "Observed" },
) {
	const commit = yield* Commit;
	yield* commit.commit(observe, {
		requestId: Request.make(make()),
		host,
		observation,
		attachment,
		observedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
	});
});
