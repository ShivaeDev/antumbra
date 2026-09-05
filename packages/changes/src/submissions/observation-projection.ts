import { Database } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { projectedChange, sameProjectedFacts, stageTransition } from "#change-projection.ts";
import type { ChangeRow } from "#change-rows.ts";
import { matchObservation, type ObservationAttachment } from "#submissions/observation-match.ts";
import { matchesClaim, observationConflict, selectMatchedRow } from "#submissions/observation-selection.ts";

interface ReconciledObservation {
	readonly changed: boolean;
	readonly row: ChangeRow;
}

const isStale = (row: ChangeRow, observation: ChangeObservation): boolean =>
	row.stage !== "prepared" && observation.activityAt < row.activityAt.getTime();

const shouldAppendTransition = (row: ChangeRow, next: ChangeRow, replayed: Option.Option<unknown>): boolean =>
	next.stage !== row.stage && (next.activityAt.getTime() > row.activityAt.getTime() || Option.isNone(replayed));

const isEqualTimeReplay = (row: ChangeRow, next: ChangeRow, append: boolean): boolean =>
	next.activityAt.getTime() === row.activityAt.getTime() && (sameProjectedFacts(row, next) || (next.stage !== row.stage && !append));

const isTerminal = (row: ChangeRow): boolean => row.stage === "landed" || row.stage === "withdrawn";

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

const updateMatchedRow = (row: ChangeRow, attachment: ObservationAttachment, hostTag: string, observation: ChangeObservation, now: number) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (isTerminal(row)) {
			if (observation.stage !== row.stage) {
				yield* Effect.logWarning("a terminal change was observed in another stage", {
					changeId: row.id,
					observed: observation.stage,
					stage: row.stage,
				});
			}
			return { changed: false, row } satisfies ReconciledObservation;
		}
		if (attachment._tag === "Claimed" && !matchesClaim(row, attachment)) {
			return yield* observationConflict(attachment, hostTag, observation);
		}
		if (isStale(row, observation)) {
			return { changed: false, row } satisfies ReconciledObservation;
		}
		const next = projectedChange(row, observation, now);
		const transition = stageTransition(row, next);
		const replayed = yield* db.ChangeTransition.where({
			id: transition.id,
		}).first();
		const append = shouldAppendTransition(row, next, replayed);
		if (isEqualTimeReplay(row, next, append)) {
			return { changed: false, row } satisfies ReconciledObservation;
		}
		yield* updateProjection(next);
		if (append) {
			yield* db.ChangeTransition.create(transition);
		}
		return { changed: true, row: next } satisfies ReconciledObservation;
	});

export const reconcileObservation = (hostTag: string, observation: ChangeObservation, now: number, attachment: ObservationAttachment) =>
	Effect.gen(function* () {
		const matches = yield* matchObservation(hostTag, observation, attachment);
		const row = yield* selectMatchedRow(matches, attachment, hostTag, observation);
		if (Option.isNone(row)) {
			return Option.none<ReconciledObservation>();
		}
		return Option.some(yield* updateMatchedRow(row.value, attachment, hostTag, observation, now));
	});
