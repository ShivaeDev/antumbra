import { type AgentSettingsChoice, RoleSettings } from "@antumbra/settings";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";

const named = (value: string | undefined): string | null => (value === undefined || value === "" ? null : value);

const asked = (backend: string | undefined, effort: string | undefined, model: string | undefined): AgentSettingsChoice => ({
	backend: named(backend),
	effort: named(effort),
	model: named(model),
});

export interface VoyageOpening {
	readonly captainBackend?: string | undefined;
	readonly captainEffort?: string | undefined;
	readonly captainModel?: string | undefined;
	readonly context: string;
	readonly crewBackend?: string | undefined;
	readonly crewEffort?: string | undefined;
	readonly crewModel?: string | undefined;
	readonly name: string;
	readonly northStar: string;
}

export const open = Effect.fn("VoyageProcedures.open")(function* (request: VoyageOpening) {
	const roles = yield* RoleSettings;
	const voyages = yield* Voyages;
	const voyage = yield* voyages.open({ context: request.context, name: request.name, northStar: request.northStar });
	yield* roles.changeForVoyage(voyage.id, "captain", asked(request.captainBackend, request.captainEffort, request.captainModel));
	yield* roles.changeForVoyage(voyage.id, "crew", asked(request.crewBackend, request.crewEffort, request.crewModel));
	return voyage;
});
