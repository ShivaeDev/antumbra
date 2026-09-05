import { Database } from "@antumbra/persistence";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";
import { submissionKey } from "#submissions/prepared-row.ts";

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

const decodedOptional = <A extends Parameters<typeof changeRow>[0]>(row: Option.Option<A>) =>
	Option.match(row, {
		onNone: () => Effect.succeed(Option.none<ChangeRow>()),
		onSome: (stored) => Effect.map(changeRow(stored), Option.some),
	});

const hasSubmissionClaim = (row: ChangeRow): boolean =>
	row.openedByAgentId !== null && row.submissionKey === submissionKey(row.openedByAgentId, row.repoId);

const selectedPrepared = (candidates: ReadonlyArray<ChangeRow>, attachment: ObservationAttachment): Option.Option<ChangeRow> => {
	if (attachment._tag === "ExternalOnly") {
		return Option.none();
	}
	if (attachment._tag === "Observed") {
		const candidate = candidates[0];
		return candidates.length === 1 && candidate !== undefined ? Option.some(candidate) : Option.none();
	}
	return Option.fromUndefinedOr(
		candidates.find(
			(row) => row.openedByAgentId === attachment.agentId && row.submissionKey === attachment.submissionKey && row.id === attachment.changeId,
		),
	);
};

export const matchObservation = Effect.fn("Changes.matchObservation")(function* (
	hostTag: string,
	observation: ChangeObservation,
	attachment: ObservationAttachment,
) {
	const db = yield* Database;
	const external = yield* db.Change.where({
		externalId: observation.externalId,
		host: hostTag,
		repoId: observation.repoId,
	}).first();
	if (observation.headSha === null) {
		return {
			external: yield* decodedOptional(external),
			prepared: Option.none<ChangeRow>(),
			preparedCandidates: [],
		} satisfies ObservationMatches;
	}
	const candidates = (yield* Effect.forEach(
		yield* db.Change.where({
			externalId: null,
			host: hostTag,
			preparedHeadRef: observation.headRef,
			preparedHeadSha: observation.headSha,
			repoId: observation.repoId,
			stage: "prepared",
		}).all(),
		changeRow,
	)).filter(hasSubmissionClaim);
	return {
		external: yield* decodedOptional(external),
		prepared: selectedPrepared(candidates, attachment),
		preparedCandidates: candidates,
	} satisfies ObservationMatches;
});
