import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { ChangeIdentityCollision, ChangeObservationConflict } from "#submissions/errors.ts";
import type { ObservationAttachment, ObservationMatches } from "#submissions/observation-match.ts";

type ClaimedAttachment = Extract<ObservationAttachment, { readonly _tag: "Claimed" }>;

export const observationConflict = (attachment: ClaimedAttachment, hostTag: string, observation: ChangeObservation) =>
	new ChangeObservationConflict({
		changeId: attachment.changeId,
		externalId: observation.externalId,
		host: hostTag,
	});

export const matchesClaim = (row: ChangeRow, attachment: ClaimedAttachment): boolean =>
	row.id === attachment.changeId && row.openedByAgentId === attachment.agentId && row.submissionKey === attachment.submissionKey;

const unattachedChangeId = (attachment: Exclude<ObservationAttachment, { readonly _tag: "Observed" }>, candidate: ChangeRow): string =>
	attachment._tag === "Claimed" ? attachment.changeId : candidate.id;

export const selectMatchedRow = (matches: ObservationMatches, attachment: ObservationAttachment, hostTag: string, observation: ChangeObservation) =>
	Effect.gen(function* () {
		if (Option.isSome(matches.external) && matches.preparedCandidates.length > 0) {
			return yield* new ChangeIdentityCollision({
				externalChangeId: matches.external.value.id,
				externalId: observation.externalId,
				host: hostTag,
				preparedChangeIds: matches.preparedCandidates.map((row) => row.id),
			});
		}
		if (attachment._tag === "Claimed" && Option.isSome(matches.external) && !matchesClaim(matches.external.value, attachment)) {
			return yield* observationConflict(attachment, hostTag, observation);
		}
		const candidate = matches.preparedCandidates[0];
		if (attachment._tag !== "Observed" && Option.isNone(matches.external) && Option.isNone(matches.prepared) && candidate !== undefined) {
			return yield* new ChangeObservationConflict({
				changeId: unattachedChangeId(attachment, candidate),
				externalId: observation.externalId,
				host: hostTag,
			});
		}
		return Option.orElse(matches.external, () => matches.prepared);
	});
