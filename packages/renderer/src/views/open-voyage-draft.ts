import type { OpenVoyageRequest } from "@antumbra/contract";
import { Schema } from "effect";
import { chosenOf, EMPTY_DRAFT, roleDraftSchema } from "#views/role-settings.ts";

export const voyageDraftSchema = Schema.Struct({
	captain: roleDraftSchema,
	context: Schema.String,
	crew: roleDraftSchema,
	name: Schema.NonEmptyString,
	northStar: Schema.NonEmptyString,
});
export type VoyageDraft = typeof voyageDraftSchema.Type;

export const emptyDraft: VoyageDraft = { captain: EMPTY_DRAFT, context: "", crew: EMPTY_DRAFT, name: "", northStar: "" };

export const openVoyageRequest = (draft: VoyageDraft): OpenVoyageRequest => {
	const captain = chosenOf(draft.captain);
	const crew = chosenOf(draft.crew);
	return {
		...(captain.backend === null ? {} : { captainBackend: captain.backend }),
		...(captain.effort === null ? {} : { captainEffort: captain.effort }),
		...(captain.model === null ? {} : { captainModel: captain.model }),
		context: draft.context,
		...(crew.backend === null ? {} : { crewBackend: crew.backend }),
		...(crew.effort === null ? {} : { crewEffort: crew.effort }),
		...(crew.model === null ? {} : { crewModel: crew.model }),
		name: draft.name,
		northStar: draft.northStar,
	};
};
