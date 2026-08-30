import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { ensureAgentResourcesUnclaimed, ensureBranchResourcesUnclaimed } from "@antumbra/resource-reclamation";
import { Clock, Effect, Option, Result } from "effect";
import type { ObservationAttachment } from "#change-submissions/observation-match.ts";
import { reconcileObservation } from "#change-submissions/observation-projection.ts";

const transientConnection = (failure: PrismaError): boolean => failure.reason._tag === "PrismaConnectionFailure" && failure.reason.transient === true;

const ensureObservationUnclaimed = (observation: ChangeObservation, attachment: ObservationAttachment) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (attachment._tag === "Claimed") {
			yield* ensureAgentResourcesUnclaimed(attachment.agentId);
		}
		const repo = yield* db.Repo.where({ id: observation.repoId }).first();
		if (Option.isSome(repo)) {
			yield* ensureBranchResourcesUnclaimed(repo.value.source, observation.headRef);
		}
	});

const applyObservation = (hostTag: string, observation: ChangeObservation, now: number, attachment: ObservationAttachment) =>
	Effect.gen(function* () {
		const db = yield* Database;
		while (true) {
			const attempted = yield* Effect.result(
				db.transaction(
					Effect.gen(function* () {
						yield* Database;
						yield* ensureObservationUnclaimed(observation, attachment);
						return yield* reconcileObservation(hostTag, observation, now, attachment);
					}),
				),
			);
			if (Result.isSuccess(attempted)) {
				return attempted.success;
			}
			if (attempted.failure._tag !== "PrismaError" || !transientConnection(attempted.failure)) {
				return yield* attempted.failure;
			}
			yield* Effect.yieldNow;
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
		const now = yield* Clock.currentTimeMillis;
		const results = yield* Effect.forEach(observations, (observation) => applyObservation(hostTag, observation, now, attachment), { concurrency: 1 });
		const reconciled = results.flatMap((result) => (Option.isSome(result) ? [result.value] : []));
		if (reconciled.some((result) => result.changed)) {
			yield* Effect.all([feeds.publishResourceReclaim(), feeds.publishVoyageRefresh()], { discard: true });
		}
		return reconciled.map((result) => result.row);
	});
};
