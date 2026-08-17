import { Database } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";

export const matchObservation = (
	hostTag: string,
	observation: ChangeObservation,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const external = yield* db.Change.where({
			externalId: observation.externalId,
			host: hostTag,
			repoId: observation.repoId,
		}).first();
		if (Option.isSome(external)) {
			return Option.some(changeRow(external.value));
		}
		if (observation.headSha === null) {
			return Option.none<ChangeRow>();
		}
		const candidates = (yield* db.Change.where({
			host: hostTag,
			repoId: observation.repoId,
		}).all())
			.map(changeRow)
			.filter(
				(row) =>
					row.externalId === null &&
					row.stage === "prepared" &&
					row.preparedHeadRef === observation.headRef &&
					row.preparedHeadSha === observation.headSha,
			);
		const candidate = candidates[0];
		return candidates.length === 1 && candidate !== undefined
			? Option.some(candidate)
			: Option.none<ChangeRow>();
	});
