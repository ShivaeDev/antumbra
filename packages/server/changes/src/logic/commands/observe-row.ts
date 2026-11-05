import { projectObservation, sameEvidence } from "@antumbra/domain-changes/commands/observation.ts";
import type { ChangeRow } from "@antumbra/domain-changes/rows/change.ts";
import type { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const observeRow = Effect.fn("changes.observeRow")(function* (row: ChangeRow, seen: Observation, now: string) {
	const rows = yield* Records;

	if (row.stage === "landed" || row.stage === "withdrawn" || (row.stage !== "prepared" && seen.activityAt < Date.parse(row.activityAt)))
		return { change: null, transition: null };
	const next = projectObservation(row, seen, now);
	const id = `${row.id}:${seen.activityAt}:${next.stage}`;
	const append =
		row.stage !== next.stage &&
		(seen.activityAt > Date.parse(row.activityAt) ||
			!(yield* rows.changeTransition.count({ where: { id: id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)));
	if (seen.activityAt === Date.parse(row.activityAt) && (sameEvidence(row, next) || (row.stage !== next.stage && !append)))
		return { change: null, transition: null };
	return {
		change: next,
		transition: append ? { id, changeId: row.id, fromStage: row.stage, toStage: next.stage, activityAt: next.activityAt, observedAt: now } : null,
	};
});
