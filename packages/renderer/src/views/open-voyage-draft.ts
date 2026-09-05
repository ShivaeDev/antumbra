import type { OpenVoyageRequest } from "@antumbra/contract";
import { Schema } from "effect";

export const agentDraftSchema = Schema.Struct({ backend: Schema.String, effort: Schema.String, model: Schema.String });
export type AgentDraft = typeof agentDraftSchema.Type;
export const voyageDraftSchema = Schema.Struct({
	captain: agentDraftSchema,
	crew: agentDraftSchema,
	context: Schema.String,
	name: Schema.NonEmptyString,
	northStar: Schema.NonEmptyString,
});
export type VoyageDraft = typeof voyageDraftSchema.Type;

const noSettings: AgentDraft = { backend: "", effort: "", model: "" };

export const emptyDraft: VoyageDraft = { captain: noSettings, context: "", crew: noSettings, name: "", northStar: "" };

export const openVoyageRequest = (draft: VoyageDraft): OpenVoyageRequest => ({
	backend: draft.captain.backend,
	captainBackend: draft.captain.backend,
	...(draft.captain.effort === "" ? {} : { captainEffort: draft.captain.effort }),
	...(draft.captain.model === "" ? {} : { captainModel: draft.captain.model }),
	context: draft.context,
	crewBackend: draft.crew.backend,
	...(draft.crew.effort === "" ? {} : { crewEffort: draft.crew.effort }),
	...(draft.crew.model === "" ? {} : { crewModel: draft.crew.model }),
	name: draft.name,
	northStar: draft.northStar,
});

const chosenBackend = (backends: ReadonlyArray<string>, backend: string): string => (backends.includes(backend) ? backend : (backends[0] ?? ""));

export const withChosenBackends = (backends: ReadonlyArray<string>, draft: VoyageDraft): VoyageDraft => ({
	...draft,
	captain: { ...draft.captain, backend: chosenBackend(backends, draft.captain.backend) },
	crew: { ...draft.crew, backend: chosenBackend(backends, draft.crew.backend) },
});

export const withPresetModel = (agent: AgentDraft, model: string): AgentDraft => (model === "" || agent.model !== "" ? agent : { ...agent, model });
