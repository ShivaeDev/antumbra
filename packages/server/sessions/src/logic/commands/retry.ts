import type * as Source from "@antumbra/domain-sessions/commands/retry.ts";
import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";

export const operationRetried = fact("SessionOperationRetried", { previousId: SessionOperationId, operation: sessionOperation.Row });

export const retry = Effect.fn("Sessions.retry")(function* (
	input: typeof Source.retry.Input.Type,
	reject: typeof Source.retry.reject,
): Effect.fn.Return<typeof Source.retry.emits.Payload.Type, RejectedBy<typeof Source.retry.rejections>, Records> {
	const rows = yield* Records;

	const held = yield* rows.sessionOperation
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(held) || held.value.status !== "waiting") return yield* reject.Unavailable({ message: "The operation is not waiting for retry" });
	const root = yield* rows.session
		.findOne({ where: { id: held.value.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(root) || root.value.status !== "open") return yield* reject.Unavailable({ message: "The session has ended" });
	if (root.value.stoppedAt !== null) return yield* reject.Unavailable({ message: "The session is stopped" });
	return {
		previousId: input.id,
		operation: { ...held.value, id: SessionOperationId.make(input.requestId), status: "requested" as const, detail: null },
	};
});
