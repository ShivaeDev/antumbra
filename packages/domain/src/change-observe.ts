import type { PrismaError } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Clock, Effect, Option, PubSub } from "effect";
import { projectedChange, stageTransition } from "#change-projection.ts";
import { changeOfExternalId } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";

interface ReconciledObservation {
	readonly changed: boolean;
	readonly row: ChangeRow;
}

const refused = (row: ChangeRow, observation: ChangeObservation) =>
	Effect.logWarning("a settled change was observed unsettled", {
		changeId: row.id,
		observed: observation.stage,
		stage: row.stage,
	});

const unsettlesLandedChange = (
	row: ChangeRow,
	observation: ChangeObservation,
): boolean => row.stage === "landed" && observation.stage !== "landed";

// why: read, freshness decision, transition append and projection update all
// happen inside the serialized transaction. Provider timestamps are not unique
// revisions: at equal time an unseen destination stage is the next fact in
// observed order, while its durable transition id makes a later replay a no-op.
// Older facts cannot roll the row back, and landed remains irreversible.
export const applyObservations = (
	deps: AgentDeps,
	hostTag: string,
	observations: ReadonlyArray<ChangeObservation>,
): Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError> => {
	if (observations.length === 0) {
		return Effect.succeed([]);
	}
	const updateProjection = (row: ChangeRow) =>
		deps.db.Change.where({ id: row.id }).update({
			activityAt: row.activityAt,
			baseRef: row.baseRef,
			checks: row.checks,
			draftAt: row.draftAt,
			headRef: row.headRef,
			headSha: row.headSha,
			landedAt: row.landedAt,
			mergeable: row.mergeable,
			observedAt: row.observedAt,
			raw: row.raw,
			review: row.review,
			stage: row.stage,
			title: row.title,
			url: row.url,
			withdrawnAt: row.withdrawnAt,
		});
	const stageTransitionToAppend = (before: ChangeRow, after: ChangeRow) =>
		Effect.gen(function* () {
			if (after.stage === before.stage) {
				return Option.none();
			}
			const transition = stageTransition(before, after);
			if (after.activityAt.getTime() > before.activityAt.getTime()) {
				return Option.some(transition);
			}
			const replayed = yield* deps.db.ChangeTransition.where({
				id: transition.id,
			}).first();
			return Option.isSome(replayed) ? Option.none() : Option.some(transition);
		});
	const reconcile = (observation: ChangeObservation, now: number) =>
		Effect.gen(function* () {
			const known = yield* changeOfExternalId(
				deps,
				hostTag,
				observation.repoId,
				observation.externalId,
			);
			if (Option.isNone(known)) {
				return Option.none<ReconciledObservation>();
			}
			const row = known.value;
			if (unsettlesLandedChange(row, observation)) {
				yield* refused(row, observation);
				return Option.some({ changed: false, row });
			}
			if (observation.activityAt < row.activityAt.getTime()) {
				return Option.some({ changed: false, row });
			}
			const next = projectedChange(row, observation, now);
			const transition = yield* stageTransitionToAppend(row, next);
			if (Option.isSome(transition)) {
				yield* deps.db.ChangeTransition.create(transition.value);
			} else if (observation.activityAt === row.activityAt.getTime()) {
				return Option.some({ changed: false, row });
			}
			yield* updateProjection(next);
			return Option.some({ changed: true, row: next });
		});
	return Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		const results = yield* provideExecutors(deps)(
			deps.writer.write(
				Effect.forEach(
					observations,
					(observation) => reconcile(observation, now),
					{ concurrency: 1 },
				),
			),
		);
		const reconciled = results.flatMap((result) =>
			Option.isSome(result) ? [result.value] : [],
		);
		if (reconciled.some((result) => result.changed)) {
			yield* PubSub.publish(deps.feeds.voyages, undefined);
		}
		return reconciled.map((result) => result.row);
	});
};
