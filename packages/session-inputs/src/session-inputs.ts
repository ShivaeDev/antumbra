import { Database, type PrismaError } from "@antumbra/persistence";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Context, Effect, Layer, Option } from "effect";
import { digestRequest } from "#digest.ts";
import type { SessionInputFailure } from "#errors.ts";
import type {
	SessionInputDeliveryStatus,
	SessionInputDraft,
	SessionInputImage,
	SessionInputReading,
	StoredSessionInput,
} from "#model.ts";
import { prepareInput } from "#prepare.ts";
import { readStoredInput } from "#read.ts";
import { readStoredImage } from "#read-image.ts";
import { deliveryStatus, requireSameRequest } from "#stored.ts";
import { storePreparedInput } from "#write.ts";

interface ImageRequest {
	readonly inputId: SessionInputId;
	readonly position: number;
	readonly sessionId: string;
}

const existingReading = (
	inputId: SessionInputId,
	delivery: string,
): Effect.Effect<SessionInputReading, SessionInputFailure> =>
	Effect.fromResult(deliveryStatus(inputId, delivery)).pipe(
		Effect.map((status) => ({ id: inputId, status })),
	);

export class SessionInputs extends Context.Service<
	SessionInputs,
	{
		readonly image: (
			request: ImageRequest,
		) => Effect.Effect<SessionInputImage, PrismaError | SessionInputFailure>;
		readonly ingest: (
			draft: SessionInputDraft,
		) => Effect.Effect<SessionInputReading, PrismaError | SessionInputFailure>;
		readonly load: (
			inputId: SessionInputId,
		) => Effect.Effect<StoredSessionInput, PrismaError | SessionInputFailure>;
		readonly mark: (
			inputId: SessionInputId,
			status: SessionInputDeliveryStatus,
		) => Effect.Effect<void, PrismaError | SessionInputFailure>;
	}
>()("@antumbra/session-inputs/SessionInputs") {}

export const SessionInputsLive = (root: string) =>
	Layer.effect(SessionInputs)(
		Effect.gen(function* () {
			const db = yield* Database;
			const context = Context.make(Database, db);
			const ingest = (draft: SessionInputDraft) =>
				Effect.gen(function* () {
					const existing = yield* db.SessionInput.where({
						id: draft.id,
					}).first();
					if (Option.isSome(existing)) {
						yield* requireSameRequest(
							draft.id,
							digestRequest(draft.sessionId, draft.parts),
							existing.value.requestDigest,
						);
						return yield* existingReading(
							draft.id,
							existing.value.deliveryStatus,
						);
					}
					return yield* Effect.flatMap(prepareInput(draft), (prepared) =>
						storePreparedInput(root, prepared),
					);
				}).pipe(Effect.provide(context));
			const mark = (
				inputId: SessionInputId,
				status: SessionInputDeliveryStatus,
			) =>
				db.SessionInput.where({ id: inputId })
					.update({
						deliveryStatus: status,
					})
					.pipe(Effect.asVoid, Effect.provide(context));
			return {
				image: (request) =>
					readStoredImage(root, request).pipe(Effect.provide(context)),
				ingest,
				load: (inputId) =>
					readStoredInput(root, inputId).pipe(Effect.provide(context)),
				mark,
			};
		}),
	);
