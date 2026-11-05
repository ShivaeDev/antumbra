import type * as Source from "@antumbra/domain-inputs/commands/retry.ts";
import { SessionId, SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as capacitySelection } from "@antumbra/server-storage/records/capacity.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const retry = Effect.fn("inputs.retry")(function* (
	input: typeof Source.retry.Input.Type,
	reject: typeof Source.retry.reject,
): Effect.fn.Return<typeof Source.retry.emits.Payload.Type, RejectedBy<typeof Source.retry.rejections>, Records> {
	const rows = yield* Records;

	const stored = yield* rows.sessionInput
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(stored) || stored.value.status !== "refused") return yield* reject.DeliverySettled({ inputId: input.id });
	const operations = yield* rows.sessionOperation
		.findMany({ where: { inputId: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	if (operations.some((operation) => operation.status === "requested")) return yield* reject.DeliverySettled({ inputId: input.id });
	const target = yield* rows.session
		.findOne({
			where: { id: SessionId.make(stored.value.sessionId) },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionSelection,
		})
		.pipe(Effect.orDie);
	if (Option.isNone(target) || target.value.status !== "open" || target.value.parentSessionId !== null)
		return yield* reject.InputRefused({ inputId: input.id, detail: "only an open root session can receive input" });
	const capacities = yield* rows.capacity
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: capacitySelection })
		.pipe(Effect.orDie);
	const blocked = capacities.some((reading) => reading.backend === target.value.backend && reading.status === "blocked");
	return {
		id: input.id,
		sessionId: target.value.id,
		operationId: SessionOperationId.make(input.requestId),
		deliveryKind: target.value.attached && !blocked ? ("steer" as const) : ("wake" as const),
	};
});
