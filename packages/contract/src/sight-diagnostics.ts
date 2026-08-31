import { Schema } from "effect";

export const IntentDiagnostic = Schema.Struct({
	detail: Schema.NullOr(Schema.String),
	id: Schema.String,
	kind: Schema.String,
	state: Schema.String,
});
export type IntentDiagnostic = typeof IntentDiagnostic.Type;

export const SessionDiagnostics = Schema.Struct({
	current: Schema.Boolean,
	execution: Schema.String,
	intents: Schema.Array(IntentDiagnostic),
});
export type SessionDiagnostics = typeof SessionDiagnostics.Type;

export const AgentDiagnostics = Schema.Struct({
	currentSessionId: Schema.NullOr(Schema.String),
	intents: Schema.Array(IntentDiagnostic),
});
export type AgentDiagnostics = typeof AgentDiagnostics.Type;

export const FleetDiagnostics = Schema.Struct({
	intents: Schema.Array(IntentDiagnostic),
});
export type FleetDiagnostics = typeof FleetDiagnostics.Type;
