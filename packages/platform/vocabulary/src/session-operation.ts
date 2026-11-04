import { Schema } from "effect";
import { SessionId, SessionOperationId } from "#session-ids.ts";
import { SwitchKey } from "#settings-ids.ts";

export const SessionOperationFields = Schema.Struct({
	id: SessionOperationId,
	sessionId: SessionId,
	kind: Schema.Literals(["wake", "sleep", "stop", "interrupt", "steer"]),
	inputId: Schema.NullOr(Schema.String),
	reason: Schema.String,
	status: Schema.Literals(["requested", "accepted", "waiting", "ambiguous", "cancelled"]),
	detail: Schema.NullOr(Schema.String),
	requestedAt: Schema.String,
});
export const SessionOperation = Schema.Struct({ ...SessionOperationFields.fields, sequence: Schema.Number, gatedBy: Schema.NullOr(SwitchKey) });
