import { Database, type PrismaError } from "@antumbra/persistence";
import { type Context, Effect, Option } from "effect";
import { publishImage } from "#adapters/custody.ts";
import type { SessionInputConflict, SessionInputCustodyFailed, StoredSessionInputInvalid } from "#errors.ts";
import type { PreparedSessionInput, PreparedSessionInputPart, SessionInputReading } from "#model.ts";
import { deliveryStatus, requireSameRequest } from "#stored.ts";

const attachmentId = (part: PreparedSessionInputPart) =>
	Effect.gen(function* () {
		if (part.type === "text") {
			return null;
		}
		const db = yield* Database;
		const existing = yield* db.SessionAttachment.where({
			digest: part.image.digest,
		}).first();
		if (Option.isSome(existing)) {
			return existing.value.id;
		}
		const id = crypto.randomUUID();
		yield* db.SessionAttachment.create({
			byteSize: part.image.bytes.length,
			digest: part.image.digest,
			height: part.image.height,
			id,
			mediaType: part.image.mediaType,
			width: part.image.width,
		});
		return id;
	});

const writeInput = (prepared: PreparedSessionInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const existing = yield* db.SessionInput.where({ id: prepared.id }).first();
		if (Option.isSome(existing)) {
			yield* requireSameRequest(prepared.id, prepared.requestDigest, existing.value.requestDigest);
			return {
				id: prepared.id,
				status: yield* Effect.fromResult(deliveryStatus(prepared.id, existing.value.deliveryStatus)),
			} satisfies SessionInputReading;
		}
		const attachments = yield* Effect.forEach(prepared.parts, attachmentId);
		yield* db.SessionInput.create({
			deliveryStatus: "pending",
			id: prepared.id,
			requestDigest: prepared.requestDigest,
			sessionId: prepared.sessionId,
		});
		yield* Effect.forEach(prepared.parts, (part, position) =>
			db.SessionInputPart.create({
				attachmentId: attachments[position] ?? null,
				displayName: part.type === "image" ? part.name : null,
				inputId: prepared.id,
				kind: part.type,
				position,
				text: part.type === "text" ? part.text : null,
			}),
		);
		return { id: prepared.id, status: "pending" } satisfies SessionInputReading;
	});

export const storePreparedInput = (
	root: string,
	prepared: PreparedSessionInput,
): Effect.Effect<
	SessionInputReading,
	PrismaError | SessionInputConflict | SessionInputCustodyFailed | StoredSessionInputInvalid,
	Context.Service.Identifier<typeof Database>
> =>
	Effect.gen(function* () {
		for (const part of prepared.parts) {
			if (part.type === "image") {
				yield* publishImage(root, part.image.digest, part.image.mediaType, part.image.bytes);
			}
		}
		return yield* writeInput(prepared);
	});
