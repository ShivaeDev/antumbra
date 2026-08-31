import { Schema } from "effect";

export const ChangeSituation = Schema.Literals(["merge_conflicts", "checks_failed", "unresolved_reviews"]);
export type ChangeSituation = typeof ChangeSituation.Type;

export const SessionSituation = Schema.Struct({
	changeId: Schema.String,
	reference: Schema.String,
	situation: ChangeSituation,
});
export type SessionSituation = typeof SessionSituation.Type;
