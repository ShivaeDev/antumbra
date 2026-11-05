import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { operationRequested } from "#facts/operation-requested.ts";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";
import { sessionOperation } from "#rows/session-operation.ts";
export const request = command("request", {
	input: {
		sessionId: SessionId,
		kind: sessionOperation.fields.kind,
		inputId: Schema.NullOr(Schema.String),
		reason: Schema.String,
		requestedAt: Schema.String,
	},
	reads: [session, sessionOperation, flag],
	emits: operationRequested,
	rejections: { Unavailable: { message: Schema.String }, Busy: { message: Schema.String } },
});
