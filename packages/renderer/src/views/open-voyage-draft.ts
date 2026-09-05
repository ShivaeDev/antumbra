import type { OpenVoyageRequest } from "@antumbra/contract";

export interface AgentDraft {
	readonly backend: string;
	readonly effort: string;
	readonly model: string;
}

export interface VoyageDraft {
	readonly captain: AgentDraft;
	readonly context: string;
	readonly crew: AgentDraft;
	readonly name: string;
	readonly northStar: string;
}

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

export const withBackend = (backend: string): AgentDraft => ({ backend, effort: "", model: "" });

export const withPresetModel = (agent: AgentDraft, model: string): AgentDraft => (model === "" || agent.model !== "" ? agent : { ...agent, model });
