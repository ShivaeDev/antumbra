import { record } from "@antumbra/domain-inputs/commands/record.ts";
import { InputDelivery } from "@antumbra/domain-inputs/delivery.ts";
import { InputAmbiguous, InputConflict, InputNotFound } from "@antumbra/domain-inputs/errors.ts";
import { reading } from "@antumbra/domain-inputs/queries/reading.ts";
import { InputsRpc } from "@antumbra/domain-inputs/rpc.ts";
import type { Draft, ImageRequest, Receipt } from "@antumbra/domain-inputs/schema.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { readImage } from "#adapters/inputs/custody.ts";
import { digestRequest } from "#adapters/inputs/digest.ts";
import { prepare } from "#adapters/inputs/prepare.ts";
import { transcriptThumbnail } from "#adapters/inputs/thumbnail.ts";

export const handlers = Effect.fn("inputs.handlers")(function* (root: string) {
	const commit = yield* Commit;
	const live = yield* Live;
	const delivery = yield* InputDelivery;
	const current = (sessionId: string, id: Draft["id"]) => live.live(reading, { sessionId, id }).pipe(Stream.runHead, Effect.map(Option.getOrNull));
	const submit = Effect.fn("inputs.submit")(function* (draft: Draft) {
		yield* delivery.admit(draft);
		const held = yield* current(draft.sessionId, draft.id);
		const digest = digestRequest(draft.sessionId, draft.parts);
		if (held !== null && held.requestDigest !== digest) return yield* new InputConflict({ inputId: draft.id });
		if (held?.status === "ambiguous") return yield* new InputAmbiguous({ inputId: draft.id });
		if (held?.status === "accepted" || held?.status === "queued_for_wake") return { id: draft.id, status: held.status } satisfies Receipt;
		if (held === null) {
			const prepared = yield* prepare(root, draft);
			yield* commit
				.commit(record, { ...prepared, requestId: Request.make(`input:${draft.id}`) })
				.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
			const recorded = yield* current(draft.sessionId, draft.id);
			if (recorded === null || recorded.requestDigest !== digest) return yield* new InputConflict({ inputId: draft.id });
		}
		return { id: draft.id, status: yield* delivery.deliver({ sessionId: draft.sessionId, inputId: draft.id }) } satisfies Receipt;
	});
	const image = Effect.fn("inputs.image")(function* (request: ImageRequest) {
		const held = yield* current(request.sessionId, request.inputId);
		const part = held?.parts[request.position];
		if (part === undefined || part.type !== "image") return yield* new InputNotFound({ inputId: request.inputId });
		const bytes = yield* readImage(root, part.attachment.digest, part.attachment.mediaType);
		return { bytes: yield* transcriptThumbnail(bytes), mediaType: "image/webp" as const, name: part.name };
	});
	return { "inputs.submit": submit, "inputs.image": image };
});
export const servingInputs = (root: string) => InputsRpc.toLayer(handlers(root));
