import { Schema } from "effect";

// why: the three states of a Change that the admiral can put an Agent back on
// in one act. They are a derived reading, not host words and not durable
// truth: the record already holds whether a Change conflicts, whether its
// checks are red and whether a reviewer asked for changes, and this names the
// three of those a Session can be sent at.
export const ChangeSituation = Schema.Literals(["merge_conflicts", "checks_failed", "unresolved_reviews"]);
export type ChangeSituation = typeof ChangeSituation.Type;

// why: one addressable situation on one Change, published rather than derived
// so the window offers exactly what the domain concluded. The reference is the
// host's own name for the Change, because an Agent may be at work on more than
// one and two identical controls would say nothing about which is which.
export const SessionSituation = Schema.Struct({
	changeId: Schema.String,
	reference: Schema.String,
	situation: ChangeSituation,
});
export type SessionSituation = typeof SessionSituation.Type;
