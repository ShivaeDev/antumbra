import { Database } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import {
	projectedChange,
	sameProjectedFacts,
	stageTransition,
} from "#change-projection.ts";
import type { ChangeRow } from "#change-rows.ts";
import { matchObservation } from "#change-submissions/observation-match.ts";

export interface ReconciledObservation {
	readonly changed: boolean;
	readonly row: ChangeRow;
}

const isStale = (row: ChangeRow, observation: ChangeObservation): boolean =>
	row.stage !== "prepared" && observation.activityAt < row.activityAt.getTime();

const shouldAppendTransition = (
	row: ChangeRow,
	next: ChangeRow,
	replayed: Option.Option<unknown>,
): boolean =>
	next.stage !== row.stage &&
	(next.activityAt.getTime() > row.activityAt.getTime() ||
		Option.isNone(replayed));

const isEqualTimeReplay = (
	row: ChangeRow,
	next: ChangeRow,
	append: boolean,
): boolean =>
	next.activityAt.getTime() === row.activityAt.getTime() &&
	(sameProjectedFacts(row, next) || (next.stage !== row.stage && !append));

const updateProjection = (row: ChangeRow) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Change.where({ id: row.id }).update({
			activityAt: row.activityAt,
			baseRef: row.baseRef,
			checks: row.checks,
			draftAt: row.draftAt,
			externalId: row.externalId,
			headRef: row.headRef,
			headSha: row.headSha,
			landedAt: row.landedAt,
			mergeable: row.mergeable,
			observedAt: row.observedAt,
			raw: row.raw,
			review: row.review,
			stage: row.stage,
			submissionKey: row.submissionKey,
			title: row.title,
			url: row.url,
			withdrawnAt: row.withdrawnAt,
		});
	});

export const reconcileObservation = (
	hostTag: string,
	observation: ChangeObservation,
	now: number,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const known = yield* matchObservation(hostTag, observation);
		if (Option.isNone(known)) {
			return Option.none<ReconciledObservation>();
		}
		const row = known.value;
		if (row.stage === "landed" && observation.stage !== "landed") {
			yield* Effect.logWarning("a settled change was observed unsettled", {
				changeId: row.id,
				observed: observation.stage,
				stage: row.stage,
			});
			return Option.some({ changed: false, row });
		}
		if (isStale(row, observation)) {
			return Option.some({ changed: false, row });
		}
		const next = projectedChange(row, observation, now);
		const transition = stageTransition(row, next);
		const replayed = yield* db.ChangeTransition.where({
			id: transition.id,
		}).first();
		const append = shouldAppendTransition(row, next, replayed);
		if (isEqualTimeReplay(row, next, append)) {
			return Option.some({ changed: false, row });
		}
		if (append) {
			yield* db.ChangeTransition.create(transition);
		}
		yield* updateProjection(next);
		return Option.some({ changed: true, row: next });
	});
