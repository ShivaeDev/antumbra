import { DomainFeeds } from "@antumbra/domain-feeds";
import { Writer } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Clock, Effect, Option, PubSub } from "effect";
import type { ObservationAttachment } from "#change-submissions/observation-match.ts";
import { reconcileObservation } from "#change-submissions/observation-projection.ts";

export const applyObservations = (
	hostTag: string,
	observations: ReadonlyArray<ChangeObservation>,
	attachment: ObservationAttachment = { _tag: "Observed" },
) => {
	if (observations.length === 0) {
		return Effect.succeed([]);
	}
	return Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const now = yield* Clock.currentTimeMillis;
		const results = yield* writer.write(
			Effect.forEach(
				observations,
				(observation) =>
					reconcileObservation(hostTag, observation, now, attachment),
				{ concurrency: 1 },
			),
		);
		const reconciled = results.flatMap((result) =>
			Option.isSome(result) ? [result.value] : [],
		);
		if (reconciled.some((result) => result.changed)) {
			yield* PubSub.publish(feeds.voyages, undefined);
		}
		return reconciled.map((result) => result.row);
	});
};
