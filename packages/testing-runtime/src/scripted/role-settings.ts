import {
	type AgentSettingsChoice,
	FLEET_SCOPE,
	type ResolvedAgentSettings,
	RoleSettings,
	UNCHOSEN_AGENT_SETTINGS,
	type VoyageAgentSettings,
} from "@antumbra/settings";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend.ts";
import { AGENT_ROLES, type AgentRole } from "@antumbra/vocabulary/agent-role.ts";
import { Effect, Layer, Ref } from "effect";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

type Chosen = ReadonlyMap<string, AgentSettingsChoice>;

const keyOf = (scope: string, role: string): string => `${scope}/${role}`;

const chosen = (stored: Chosen, scope: string, role: AgentRole): AgentSettingsChoice => stored.get(keyOf(scope, role)) ?? UNCHOSEN_AGENT_SETTINGS;

const settled = (choice: AgentSettingsChoice): ResolvedAgentSettings | undefined =>
	choice.backend === null
		? undefined
		: {
				backend: choice.backend,
				...(choice.effort === null ? {} : { effort: choice.effort }),
				...(choice.model === null ? {} : { model: choice.model }),
			};

const resolved = (stored: Chosen, voyageId: string | null, role: AgentRole): ResolvedAgentSettings => {
	const own = voyageId === null ? undefined : settled(chosen(stored, voyageId, role));
	return own ?? settled(chosen(stored, FLEET_SCOPE, role)) ?? { backend: FIRST_BACKEND };
};

const written = (stored: Chosen, scope: string, role: AgentRole, choice: AgentSettingsChoice): Chosen =>
	new Map(stored).set(keyOf(scope, role), choice);

const forVoyage = (stored: Chosen, voyageId: string): VoyageAgentSettings => ({
	captain: chosen(stored, voyageId, "captain"),
	crew: chosen(stored, voyageId, "crew"),
});

export const scriptedRoleSettings: Layer.Layer<RoleSettings> = Layer.effect(RoleSettings)(
	Effect.map(Ref.make<Chosen>(new Map()), (state) => ({
		changeDefault: (role: AgentRole, choice: AgentSettingsChoice) => Ref.update(state, (stored) => written(stored, FLEET_SCOPE, role, choice)),
		changeForVoyage: (voyageId: string, role: AgentRole, choice: AgentSettingsChoice) =>
			Ref.update(state, (stored) => written(stored, voyageId, role, choice)),
		defaults: () => Effect.map(Ref.get(state), (stored) => AGENT_ROLES.map((role) => ({ ...chosen(stored, FLEET_SCOPE, role), role }))),
		forVoyages: (voyageIds: ReadonlyArray<string>) =>
			Effect.map(Ref.get(state), (stored) => new Map(voyageIds.map((voyageId) => [voyageId, forVoyage(stored, voyageId)]))),
		resolve: (voyageId: string | null, role: AgentRole) => Effect.map(Ref.get(state), (stored) => resolved(stored, voyageId, role)),
	})),
);
