import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Clock, Effect, Option, PubSub } from "effect";
import type { ObservationAttachment } from "#change-submissions/observation-match.ts";
import { reconcileObservation } from "#change-submissions/observation-projection.ts";
import {
	ensureAgentResourcesUnclaimed,
	ensureBranchResourcesUnclaimed,
} from "#resource-reclaim-guard.ts";

const ensureObservationUnclaimed = (
	observation: ChangeObservation,
	attachment: ObservationAttachment,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (attachment._tag === "Claimed") {
			yield* ensureAgentResourcesUnclaimed(attachment.agentId);
		}
		const repo = yield* db.Repo.where({ id: observation.repoId }).first();
		if (Option.isSome(repo)) {
			yield* ensureBranchResourcesUnclaimed(
				repo.value.source,
				observation.headRef,
			);
		}
	});

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
					ensureObservationUnclaimed(observation, attachment).pipe(
						Effect.andThen(
							reconcileObservation(hostTag, observation, now, attachment),
						),
					),
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
