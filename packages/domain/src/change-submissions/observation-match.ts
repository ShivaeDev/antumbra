import { Database } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";
import { submissionKey } from "#change-submissions/prepared-row.ts";

export type ObservationAttachment =
	| {
			readonly _tag: "Claimed";
			readonly agentId: string;
			readonly changeId: string;
			readonly submissionKey: string;
	  }
	| { readonly _tag: "ExternalOnly" }
	| { readonly _tag: "Observed" };

export interface ObservationMatches {
	readonly external: Option.Option<ChangeRow>;
	readonly prepared: Option.Option<ChangeRow>;
	readonly preparedCandidates: ReadonlyArray<ChangeRow>;
}

const hasSubmissionClaim = (row: ChangeRow): boolean =>
	row.openedByAgentId !== null &&
	row.submissionKey === submissionKey(row.openedByAgentId, row.repoId);

const selectedPrepared = (
	candidates: ReadonlyArray<ChangeRow>,
	attachment: ObservationAttachment,
): Option.Option<ChangeRow> => {
	if (attachment._tag === "ExternalOnly") {
		return Option.none();
	}
	if (attachment._tag === "Observed") {
		const candidate = candidates[0];
		return candidates.length === 1 && candidate !== undefined
			? Option.some(candidate)
			: Option.none();
	}
	return Option.fromUndefinedOr(
		candidates.find(
			(row) =>
				row.openedByAgentId === attachment.agentId &&
				row.submissionKey === attachment.submissionKey &&
				row.id === attachment.changeId,
		),
	);
};

export const matchObservation = (
	hostTag: string,
	observation: ChangeObservation,
	attachment: ObservationAttachment,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const external = yield* db.Change.where({
			externalId: observation.externalId,
			host: hostTag,
			repoId: observation.repoId,
		}).first();
		if (observation.headSha === null) {
			return {
				external: Option.map(external, changeRow),
				prepared: Option.none<ChangeRow>(),
				preparedCandidates: [],
			} satisfies ObservationMatches;
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
					row.preparedHeadSha === observation.headSha &&
					hasSubmissionClaim(row),
			);
		return {
			external: Option.map(external, changeRow),
			prepared: selectedPrepared(candidates, attachment),
			preparedCandidates: candidates,
		} satisfies ObservationMatches;
	});
