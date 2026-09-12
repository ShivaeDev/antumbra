import type { Attachment } from "@antumbra/domain-changes/commands/observation.ts";
import { observe } from "@antumbra/domain-changes/commands/observe.ts";
import type { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Clock, Effect } from "effect";
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
