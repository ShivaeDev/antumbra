import type { AgentRole, VoyageAgentRole } from "@antumbra/vocabulary/agent-role.ts";
import { Context, type Effect } from "effect";
import type { AgentSettingsChoice, ResolvedAgentSettings, RoleDefault, VoyageAgentSettings } from "#roles/choice.ts";

export interface RoleSettingsService {
	readonly changeDefault: (role: AgentRole, choice: AgentSettingsChoice) => Effect.Effect<void>;
	readonly changeForVoyage: (voyageId: string, role: VoyageAgentRole, choice: AgentSettingsChoice) => Effect.Effect<void>;
	readonly defaults: () => Effect.Effect<ReadonlyArray<RoleDefault>>;
	readonly forVoyages: (voyageIds: ReadonlyArray<string>) => Effect.Effect<ReadonlyMap<string, VoyageAgentSettings>>;
	readonly resolve: (voyageId: string | null, role: AgentRole) => Effect.Effect<ResolvedAgentSettings>;
}

export class RoleSettings extends Context.Service<RoleSettings, RoleSettingsService>()("@antumbra/settings/RoleSettings") {}
