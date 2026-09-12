import { access } from "node:fs/promises";
import { join } from "node:path";
import type { Input } from "@antumbra/platform-runner/input.ts";
import type { SessionInput } from "@antumbra/runner-ports/backend.ts";
import { Effect } from "effect";
import { FileFailure } from "#adapters/file-error.ts";

const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const resolveInput = (root: string, input: Input): Effect.Effect<SessionInput, FileFailure> =>
	Effect.gen(function* () {
		const parts = yield* Effect.forEach(input.parts, (part): Effect.Effect<SessionInput["parts"][number], FileFailure> => {
			if (part.type === "text") return Effect.succeed(part);
			const path = join(root, part.digest, `image.${extensions[part.mediaType]}`);
			return Effect.tryPromise({ try: () => access(path), catch: (cause) => new FileFailure({ detail: String(cause) }) }).pipe(
				Effect.as({ type: part.type, attachmentId: part.attachmentId, mediaType: part.mediaType, position: part.position, path }),
			);
		});
		return { id: input.id, parts };
	});
