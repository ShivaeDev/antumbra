import type { PrismaError } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Clock, Effect, PubSub } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { readVoyageWorld } from "#voyage-world.ts";

export const rawText = (payload: unknown): string | null =>
	JSON.stringify(payload) ?? null;

// why: a change that has landed or been withdrawn is history, and history is
// appended, never mutated. A host that reports it open again is telling us
// about a world we have already accounted for — the row stands and the
// disagreement goes to the log for a human to read.
const terminal = (row: ChangeRow): boolean =>
	row.stage === "landed" || row.stage === "withdrawn";

const observed = (
	row: ChangeRow,
	observation: ChangeObservation,
	now: number,
): ChangeRow => ({
	...row,
	activityAt: new Date(observation.activityAt),
	baseRef: observation.baseRef,
	checks: observation.checks,
	draftAt: observation.isDraft ? (row.draftAt ?? new Date(now)) : null,
	headRef: observation.headRef,
	headSha: observation.headSha,
	landedAt:
		observation.stage === "landed" ? (row.landedAt ?? new Date(now)) : null,
	mergeable: observation.mergeable,
	observedAt: new Date(now),
	raw: rawText(observation.raw),
	review: observation.review,
	stage: observation.stage,
	title: observation.title,
	url: observation.url,
	withdrawnAt:
		observation.stage === "withdrawn"
			? (row.withdrawnAt ?? new Date(now))
			: null,
});

const writeObserved = (deps: AgentDeps, rows: ReadonlyArray<ChangeRow>) =>
	provideExecutors(deps)(
		deps.writer.write(
			Effect.forEach(rows, (row) =>
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
				}),
			),
		),
	);

const refused = (row: ChangeRow, observation: ChangeObservation) =>
	Effect.logWarning("a settled change was observed unsettled", {
		changeId: row.id,
		observed: observation.stage,
		stage: row.stage,
	});

// why: matched by the host's own id rather than by ours, because a host answers
// about the changes it knows. A pair nobody here has a row for is not an error:
// a change opened somewhere else is adopted deliberately, never by drift.
export const applyObservations = (
	deps: AgentDeps,
	hostTag: string,
	observations: ReadonlyArray<ChangeObservation>,
): Effect.Effect<ReadonlyArray<ChangeRow>, PrismaError> =>
	Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		const world = yield* readVoyageWorld(deps);
		const known = new Map(
			world.changes
				.filter((row) => row.host === hostTag && row.externalId !== null)
				.map((row) => [row.externalId, row] as const),
		);
		const settled: ChangeRow[] = [];
		const written: ChangeRow[] = [];
		for (const observation of observations) {
			const row = known.get(observation.externalId);
			if (row === undefined) {
				continue;
			}
			if (terminal(row)) {
				yield* refused(row, observation);
				settled.push(row);
				continue;
			}
			written.push(observed(row, observation, now));
		}
		if (written.length > 0) {
			yield* writeObserved(deps, written);
			yield* PubSub.publish(deps.feeds.voyages, undefined);
		}
		return [...written, ...settled];
	});
