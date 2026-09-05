import { AgentRoleSchema } from "@antumbra/vocabulary/agent-role";
import { Schema } from "effect";

export const AgentSettingsChoice = Schema.Struct({
	backend: Schema.NullOr(Schema.String),
	effort: Schema.NullOr(Schema.String),
	model: Schema.NullOr(Schema.String),
});
export type AgentSettingsChoice = typeof AgentSettingsChoice.Type;

export const UNCHOSEN_AGENT_SETTINGS: AgentSettingsChoice = { backend: null, effort: null, model: null };

export const RoleSettings = Schema.Struct({
	...AgentSettingsChoice.fields,
	role: AgentRoleSchema,
});
export type RoleSettings = typeof RoleSettings.Type;
