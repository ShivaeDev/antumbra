import {
	Database,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import type {
	SessionInput,
	SessionInputImagePart,
	SessionInputTextPart,
} from "@antumbra/plugin-api";
import { SessionImageMediaType } from "@antumbra/vocabulary/session-input";
import { type Context, Effect, Option, Schema } from "effect";
import { imagePath, readImage } from "#adapters/custody.ts";
import {
	type SessionInputCustodyFailed,
	type SessionInputNotFound,
	StoredSessionInputInvalid,
} from "#errors.ts";
import type { SessionInputDeliveryStatus, StoredSessionInput } from "#model.ts";
import { deliveryStatus, requireInput } from "#stored.ts";

const decodeMediaType = Schema.decodeUnknownOption(SessionImageMediaType);

const invalid = (inputId: string, detail: string) =>
	new StoredSessionInputInvalid({ detail, inputId });

const imagePart = (
	root: string,
	inputId: string,
	position: number,
	id: string,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const stored = yield* db.SessionAttachment.where({ id }).first();
		if (Option.isNone(stored)) {
			return yield* invalid(inputId, `part ${position} has no attachment`);
		}
		const attachment = stored.value;
		const mediaType = decodeMediaType(attachment.mediaType);
		if (Option.isNone(mediaType)) {
			return yield* invalid(inputId, `part ${position} has unknown media type`);
		}
		yield* readImage(
			root,
			attachment.digest,
			mediaType.value,
			attachment.byteSize,
		);
		return {
			attachmentId: attachment.id,
			mediaType: mediaType.value,
			path: imagePath(root, attachment.digest, mediaType.value),
			position,
			type: "image",
		} satisfies SessionInputImagePart;
	});

const storedPart = (
	root: string,
	inputId: string,
	part: {
		readonly attachmentId: string | null;
		readonly kind: string;
		readonly position: number;
		readonly text: string | null;
	},
): Effect.Effect<
	SessionInputImagePart | SessionInputTextPart,
	PrismaError | SessionInputCustodyFailed | StoredSessionInputInvalid,
	Context.Service.Identifier<typeof Database> | WriteExecutors
> => {
	if (
		part.kind === "text" &&
		part.text !== null &&
		part.attachmentId === null
	) {
		return Effect.succeed({ text: part.text, type: "text" });
	}
	if (
		part.kind === "image" &&
		part.text === null &&
		part.attachmentId !== null
	) {
		return imagePart(root, inputId, part.position, part.attachmentId);
	}
	return Effect.fail(
		invalid(inputId, `part ${part.position} has invalid shape`),
	);
};

export const readStoredInput = (
	root: string,
	inputId: string,
): Effect.Effect<
	StoredSessionInput,
	| PrismaError
	| SessionInputCustodyFailed
	| SessionInputNotFound
	| StoredSessionInputInvalid,
	Context.Service.Identifier<typeof Database> | WriteExecutors
> =>
	Effect.gen(function* () {
		const db = yield* Database;
		const stored = yield* requireInput(inputId);
		const rows = yield* db.SessionInputPart.where({ inputId })
			.orderBy((part) => part.position.asc())
			.all();
		const parts = yield* Effect.forEach(rows, (part, index) => {
			if (part.position !== index) {
				return Effect.fail(
					invalid(inputId, "part positions are not contiguous"),
				);
			}
			return storedPart(root, inputId, part);
		});
		const [first, ...rest] = parts;
		if (first === undefined) {
			return yield* invalid(inputId, "input has no parts");
		}
		const input: SessionInput = { id: inputId, parts: [first, ...rest] };
		return {
			input,
			sessionId: stored.sessionId,
			status: yield* Effect.fromResult(
				deliveryStatus(inputId, stored.deliveryStatus),
			),
		};
	});

export type { SessionInputDeliveryStatus };
