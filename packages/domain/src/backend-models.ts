import { type AgentBackend, BackendFailure, type ModelChoice } from "@antumbra/plugin-api";
import { Effect } from "effect";

export const makeBackendModels =
	(backends: ReadonlyMap<string, AgentBackend>) =>
	(tag: string): Effect.Effect<ReadonlyArray<ModelChoice>, BackendFailure> => {
		const backend = backends.get(tag);
		return backend === undefined ? Effect.fail(new BackendFailure({ detail: `backend ${tag} is not registered`, tag })) : backend.listModels;
	};
