import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SessionId, SessionOperationId } from "#ids.ts";

export const operationFields = {
	id: SessionOperationId,
	sessionId: SessionId,
	kind: Schema.Literals(["wake", "sleep", "stop", "interrupt", "steer"]),
	inputId: Schema.NullOr(Schema.String),
	reason: Schema.String,
	status: Schema.Literals(["requested", "accepted", "waiting", "ambiguous", "cancelled"]),
	detail: Schema.NullOr(Schema.String),
	requestedAt: Schema.String,
};

export const sessionOperation = row("sessionOperation", { ...operationFields, sequence: Schema.Number }, { key: "id", scope: "sessionId" });
