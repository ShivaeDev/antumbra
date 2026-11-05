import type * as Source from "@antumbra/domain-inputs/commands/record.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { MAX_SESSION_IMAGES, MAX_SESSION_INPUT_IMAGE_BYTES } from "@antumbra/platform-vocabulary/session-input.ts";
import { selection as capacitySelection } from "@antumbra/server-storage/records/capacity.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";
export const record = Effect.fn("inputs.record")(function* (
	input: typeof Source.record.Input.Type,
	reject: typeof Source.record.reject,
): Effect.fn.Return<typeof Source.record.emits.Payload.Type, RejectedBy<typeof Source.record.rejections>, Records> {
	const rows = yield* Records;

	const target = yield* rows.session
		.findOne({ where: { id: SessionId.make(input.sessionId) }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(target) || target.value.status !== "open" || target.value.parentSessionId !== null)
		return yield* reject.InputRefused({ inputId: input.id, detail: "only an open root session can receive input" });
	const existing = yield* rows.sessionInput
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
		.pipe(Effect.orDie);
	if (Option.isSome(existing)) return yield* reject.InputConflict({ inputId: input.id });
	const texts = input.parts.filter((part) => part.type === "text");
	if (texts.some((part) => part.text.trim() === "")) return yield* reject.InvalidInput({ reason: "empty_text", detail: "text is blank" });
	const firstText = input.parts.findIndex((part) => part.type === "text");
	if (texts.length > 1 || (firstText >= 0 && input.parts.slice(firstText + 1).some((part) => part.type === "image")))
		return yield* reject.InvalidInput({ reason: "invalid_order", detail: "images must come first, followed by at most one text part" });
	const images = input.parts.filter((part) => part.type === "image");
	if (images.length > MAX_SESSION_IMAGES) return yield* reject.InvalidInput({ reason: "too_many_images", detail: "too many images" });
	if (images.reduce((size, part) => size + part.attachment.byteSize, 0) > MAX_SESSION_INPUT_IMAGE_BYTES)
		return yield* reject.InvalidInput({ reason: "input_too_large", detail: "normalized images exceed the input limit" });
	const capacities = yield* rows.capacity
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: capacitySelection })
		.pipe(Effect.orDie);
	const blocked = capacities.some((reading) => reading.backend === target.value.backend && reading.status === "blocked");
	return {
		id: input.id,
		sessionId: input.sessionId,
		requestDigest: input.requestDigest,
		parts: input.parts,
		deliveryKind: target.value.attached && !blocked ? ("steer" as const) : ("wake" as const),
	};
});
