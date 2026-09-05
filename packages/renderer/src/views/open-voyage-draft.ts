import type { OpenVoyageRequest } from "@antumbra/contract";
import { EMPTY_DRAFT, type RoleDraft } from "#views/role-settings.ts";

export interface VoyageDraft {
	readonly captain: RoleDraft;
	readonly context: string;
	readonly crew: RoleDraft;
	readonly name: string;
	readonly northStar: string;
}

export const emptyDraft: VoyageDraft = { captain: EMPTY_DRAFT, context: "", crew: EMPTY_DRAFT, name: "", northStar: "" };

export const openVoyageRequest = (draft: VoyageDraft): OpenVoyageRequest => ({
	...(draft.captain.backend === "" ? {} : { captainBackend: draft.captain.backend }),
	...(draft.captain.effort === "" ? {} : { captainEffort: draft.captain.effort }),
	...(draft.captain.model === "" ? {} : { captainModel: draft.captain.model }),
	context: draft.context,
	...(draft.crew.backend === "" ? {} : { crewBackend: draft.crew.backend }),
	...(draft.crew.effort === "" ? {} : { crewEffort: draft.crew.effort }),
	...(draft.crew.model === "" ? {} : { crewModel: draft.crew.model }),
	name: draft.name,
	northStar: draft.northStar,
});
