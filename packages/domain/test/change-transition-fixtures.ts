import { Database } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { scriptedObservation } from "#test/scripted-host.ts";

export const observed = (
	row: ChangeRow,
	repoId: string,
	activityOffset: number,
	patch: Partial<ChangeObservation>,
): ChangeObservation => ({
	...scriptedObservation("scripted", row.externalId ?? "", {
		baseRef: row.baseRef,
		headRef: row.headRef,
		repoId,
		title: row.title,
	}),
	activityAt: row.activityAt.getTime() + activityOffset,
	...patch,
});

export const storedChange = (id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return Option.getOrThrow(yield* db.Change.where({ id }).first());
	});

export const storedTransitions = (changeId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.ChangeTransition.where({ changeId }).all();
	});
