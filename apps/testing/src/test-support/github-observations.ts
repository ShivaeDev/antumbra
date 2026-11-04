import type { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Changes } from "@antumbra/server-changes/service.ts";
import { Clock, Effect } from "effect";

export const recordGitHubObservations = Effect.fn("PostgresApp.recordGitHubObservations")(function* (
	requestId: string,
	observations: readonly Observation[],
) {
	const changes = yield* Changes;
	const observedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
	for (const observation of observations)
		yield* changes.observe({
			host: "github",
			observation,
			attachment: { _tag: "Observed" },
			observedAt,
			requestId: Request.make(`${requestId}/${observation.repoId}/${observation.externalId}`),
		});
});
