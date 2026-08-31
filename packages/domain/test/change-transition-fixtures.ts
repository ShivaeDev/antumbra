import type { ChangeRow } from "@antumbra/changes";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { scriptedObservation } from "#test/scripted-host.ts";

export const observed = (row: ChangeRow, repoId: string, activityOffset: number, patch: Partial<ChangeObservation>): ChangeObservation => ({
	...scriptedObservation("scripted", row.externalId ?? "", {
		baseRef: row.baseRef,
		headRef: row.headRef,
		repoId,
		title: row.title,
	}),
	activityAt: row.activityAt.getTime() + activityOffset,
	...patch,
});
