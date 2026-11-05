import type { Attachment } from "@antumbra/domain-changes/commands/observation.ts";
import type { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Changes } from "@antumbra/server-changes/service.ts";
import { Clock, Effect } from "effect";
export const recordObservation = Effect.fn("changes.recordObservation")(function* (
	host: string,
	observation: Observation,
	attachment: Attachment = { _tag: "Observed" },
) {
	const changesService = yield* Changes;

	yield* changesService.observe({
		requestId: Request.make(make()),
		host,
		observation,
		attachment,
		observedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
	});
});
