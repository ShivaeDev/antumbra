import { ChangeSituation } from "@antumbra/vocabulary/change";
import { Schema } from "effect";

export { ChangeSituation };

export const SessionSituation = Schema.Struct({
	changeId: Schema.String,
	reference: Schema.String,
	situation: ChangeSituation,
});
export type SessionSituation = typeof SessionSituation.Type;
