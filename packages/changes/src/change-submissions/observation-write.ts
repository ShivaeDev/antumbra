import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { stageTransition } from "#change-projection.ts";
import { changeRow } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";

export interface ReconciledObservation {
	readonly changed: boolean;
	readonly row: ChangeRow;
}

const updateProjection = (current: ChangeRow, next: ChangeRow) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.Change.where({
			activityAt: current.activityAt,
			id: current.id,
			observedAt: current.observedAt,
			stage: current.stage,
		}).update({
			activityAt: next.activityAt,
			baseRef: next.baseRef,
			checks: next.checks,
			draftAt: next.draftAt,
			externalId: next.externalId,
			headRef: next.headRef,
			headSha: next.headSha,
			landedAt: next.landedAt,
			mergeable: next.mergeable,
			observedAt: next.observedAt,
			raw: next.raw,
			review: next.review,
			stage: next.stage,
			submissionKey: next.submissionKey,
			title: next.title,
			url: next.url,
			withdrawnAt: next.withdrawnAt,
		});
	});

export const commitObservationProjection = (
	current: ChangeRow,
	next: ChangeRow,
	transition: ReturnType<typeof stageTransition>,
	append: boolean,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const updated = yield* updateProjection(current, next);
		if (updated === null) {
			const winner = yield* db.Change.where({ id: current.id }).first();
			return {
				changed: false,
				row: Option.isSome(winner) ? yield* changeRow(winner.value) : current,
			} satisfies ReconciledObservation;
		}
		if (append) {
			yield* db.ChangeTransition.create(transition);
		}
		return { changed: true, row: next } satisfies ReconciledObservation;
	});
