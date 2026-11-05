import type * as Source from "@antumbra/domain-sessions/commands/request.ts";
import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { ungated } from "@antumbra/domain-settings/queries/flags.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const request = Effect.fn("sessions.request")(function* (
	input: typeof Source.request.Input.Type,
	reject: typeof Source.request.reject,
): Effect.fn.Return<typeof Source.request.emits.Payload.Type, RejectedBy<typeof Source.request.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.session
		.findOne({ where: { id: input.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found) || found.value.status !== "open" || found.value.parentSessionId !== null)
		return yield* reject.Unavailable({ message: "An open root session is required" });
	const root = found.value;
	if (input.kind === "sleep") {
		const nodes = yield* rows.session
			.findMany({ where: { rootSessionId: root.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie);
		if (nodes.some((node) => node.toolCalls > 0 || node.openDelegations > 0 || (node.attached && node.executionStatus !== "idle")))
			return yield* reject.Busy({ message: "The session still has active work" });
	}
	const flags = yield* rows.flag
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection })
		.pipe(Effect.orDie);
	const requested = yield* rows.sessionOperation
		.findMany({
			where: { sessionId: root.id, status: "requested" },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionOperationSelection,
		})
		.pipe(Effect.orDie);
	const pending = requested.filter((operation) => ungated(flags, operation.gatedBy));
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
});
