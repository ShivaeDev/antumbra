import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { operationRequested } from "#facts/operation-requested.ts";
import { SessionId, SessionOperationId } from "#ids.ts";
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
	reads: [session, sessionOperation],
	emits: operationRequested,
	rejections: { Unavailable: { message: Schema.String }, Busy: { message: Schema.String } },
	run: Effect.fn("sessions.request")(function* (input, rows, reject) {
		const found = yield* rows.session.find(input.sessionId);
		if (Option.isNone(found) || found.value.status !== "open" || found.value.parentSessionId !== null)
			return yield* reject.Unavailable({ message: "An open root session is required" });
		const root = found.value;
		if (input.kind === "sleep") {
			const nodes = yield* rows.session.where({ rootSessionId: root.id });
			if (nodes.some((node) => node.toolCalls > 0 || node.openDelegations > 0 || (node.attached && node.executionStatus !== "idle")))
				return yield* reject.Busy({ message: "The session still has active work" });
		}
		const pending = yield* rows.sessionOperation.where({ sessionId: root.id, status: "requested" });
		if (pending.some((op) => op.kind === input.kind && op.inputId === input.inputId))
			return yield* reject.Busy({ message: "This session operation is already requested" });
		return {
			id: SessionOperationId.make(input.requestId),
			sessionId: root.id,
			kind: input.kind,
			inputId: input.inputId,
			reason: input.reason,
			requestedAt: input.requestedAt,
			status: "requested" as const,
			detail: null,
		};
	}),
});
