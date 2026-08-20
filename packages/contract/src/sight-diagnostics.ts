import { Schema } from "effect";

// why: the window publishes curated capabilities and keeps raw machinery out
// of the view. Diagnostics are the one deliberate exception: durable words
// travel only inside a `diag` field, so an admiral reading a live system can
// see what it believes while no affordance is ever derived from these words.

// why: the durable Intent id travels with the chip so a state the admiral
// reports can be found again in the log without another database read.
export const IntentDiagnostic = Schema.Struct({
	id: Schema.String,
	kind: Schema.String,
	state: Schema.String,
});
export type IntentDiagnostic = typeof IntentDiagnostic.Type;

// why: `current` answers desired-versus-actual — the Agent points at exactly
// one Session, and an open, executing Session that is not the pointed-at one
// is drift that no capability field can show.
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

// why: an Intent can name rows that do not exist yet — a spawn waiting for
// admission precedes its own Agent. Fleet diagnostics keep those pending
// facts visible instead of dropping them for want of a row to sit beside.
export const FleetDiagnostics = Schema.Struct({
	intents: Schema.Array(IntentDiagnostic),
});
export type FleetDiagnostics = typeof FleetDiagnostics.Type;
