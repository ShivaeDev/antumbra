import type * as Source from "@antumbra/domain-sessions/commands/stop.ts";
import { SessionId, SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, Schema } from "effect";

export const sessionStopped = fact("SessionStopped", {
	id: SessionOperationId,
	sessionId: SessionId,
	reason: Schema.String,
	stoppedAt: Schema.String,
});

export const stop = Effect.fn("sessions.stop")(function* (
	input: typeof Source.stop.Input.Type,
	reject: typeof Source.stop.reject,
): Effect.fn.Return<typeof Source.stop.emits.Payload.Type, RejectedBy<typeof Source.stop.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.session
		.findOne({ where: { id: input.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found) || found.value.status !== "open" || found.value.parentSessionId !== null)
		return yield* reject.Unavailable({ message: "An open root session is required" });
	const root = found.value;
	const pending = yield* rows.sessionOperation
		.findMany({
			where: { sessionId: root.id, status: "requested" },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionOperationSelection,
		})
		.pipe(Effect.orDie);
	if (pending.some((operation) => operation.kind === "interrupt" && operation.inputId === null))
		return yield* reject.Busy({ message: "This session operation is already requested" });
	return { id: SessionOperationId.make(input.requestId), sessionId: root.id, reason: input.reason, stoppedAt: input.requestedAt };
});
