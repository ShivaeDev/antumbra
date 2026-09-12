import type { Observation } from "@antumbra/platform-change-host/schema.ts";
import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { Effect } from "effect";
import { projectObservation, sameEvidence } from "#observation.ts";
import type { ChangeRow } from "#rows/change.ts";
import type { changeTransition } from "#rows/change-transition.ts";
export const observeRow = Effect.fn("changes.observeRow")(function* (
	row: ChangeRow,
	seen: Observation,
	now: string,
	rows: ReadHandles<readonly [typeof changeTransition]>,
) {
	if (row.stage === "landed" || row.stage === "withdrawn" || (row.stage !== "prepared" && seen.activityAt < Date.parse(row.activityAt)))
		return { change: null, transition: null };
	const next = projectObservation(row, seen, now);
	const id = `${row.id}:${seen.activityAt}:${next.stage}`;
	const append = row.stage !== next.stage && (seen.activityAt > Date.parse(row.activityAt) || !(yield* rows.changeTransition.exists(id)));
	if (seen.activityAt === Date.parse(row.activityAt) && (sameEvidence(row, next) || (row.stage !== next.stage && !append)))
		return { change: null, transition: null };
	return {
		change: next,
		transition: append ? { id, changeId: row.id, fromStage: row.stage, toStage: next.stage, activityAt: next.activityAt, observedAt: now } : null,
	};
});
