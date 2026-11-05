import type * as Source from "@antumbra/domain-sessions/commands/hold.ts";
import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation as sessionOperationRecordSchema } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

export const operationHeld = fact("SessionOperationHeld", { id: SessionOperationId, detail: Schema.String, backend: Schema.NullOr(Schema.String) });
export const hold = Effect.fn("Sessions.hold")(function* (
	input: typeof Source.hold.Input.Type,
): Effect.fn.Return<typeof Source.hold.emits.Payload.Type, RejectedBy<typeof Source.hold.rejections>, Records> {
	const rows = yield* Records;

	yield* rows.sessionOperation.findById(input.id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionOperationRecordSchema.Row)), Effect.orDie);
	return { id: input.id, detail: input.detail, backend: null };
});
export const holdCapacity = Effect.fn("Sessions.holdCapacity")(function* (
	input: typeof Source.holdCapacity.Input.Type,
): Effect.fn.Return<typeof Source.holdCapacity.emits.Payload.Type, RejectedBy<typeof Source.holdCapacity.rejections>, Records> {
	const rows = yield* Records;

	yield* rows.sessionOperation.findById(input.id).pipe(Effect.flatMap(Schema.decodeUnknownEffect(sessionOperationRecordSchema.Row)), Effect.orDie);
	return { id: input.id, detail: input.detail, backend: input.backend };
});
