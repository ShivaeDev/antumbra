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

const resolved = (stored: Chosen, voyageId: string | null, role: AgentRole): ResolvedAgentSettings => {
	const standing = chosen(stored, FLEET_SCOPE, role);
	const override = voyageId === null ? UNCHOSEN_AGENT_SETTINGS : chosen(stored, voyageId, role);
	const sailsOn = standing.backend ?? FIRST_BACKEND;
	const backend = override.backend ?? sailsOn;
	const inherited = backend === sailsOn ? standing : UNCHOSEN_AGENT_SETTINGS;
	const effort = override.effort ?? inherited.effort;
	const model = override.model ?? inherited.model;
	return { backend, ...(effort === null ? {} : { effort }), ...(model === null ? {} : { model }) };
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
