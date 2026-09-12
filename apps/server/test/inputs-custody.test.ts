import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_SESSION_IMAGE_SOURCE_BYTES, SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { imagePath } from "#adapters/inputs/custody.ts";
import { digestRequest } from "#adapters/inputs/digest.ts";
import { prepare } from "#adapters/inputs/prepare.ts";
import { transcriptThumbnail } from "#adapters/inputs/thumbnail.ts";

const bytes = new Uint8Array(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
		"base64",
	),
);
const inputId = SessionInputId.make("00000000-0000-4000-8000-000000000041");
const image = { type: "image", name: "reef.png", bytes, declaredMediaType: "image/jpeg" } as const;
const draft = { id: inputId, sessionId: "root", parts: [image, { type: "text", text: "what is shown?" }] } as const;
const temporary = Effect.acquireRelease(
	Effect.promise(() => mkdtemp(join(tmpdir(), "antumbra-input-custody-"))),
	(root) => Effect.promise(() => rm(root, { recursive: true, force: true })),
);

it.effect("publishes normalized image bytes before returning ordered metadata and a readable thumbnail", () =>
	Effect.gen(function* () {
		const root = yield* temporary;
		const prepared = yield* prepare(root, draft);
		expect(prepared.parts.map((part) => part.type)).toEqual(["image", "text"]);
		const first = prepared.parts[0];
		if (first.type !== "image") return yield* Effect.die(new Error("first part is not an image"));
		expect(first.attachment.mediaType).toBe("image/png");
		const stored = yield* Effect.promise(() => readFile(imagePath(root, first.attachment.digest, first.attachment.mediaType)));
		expect(stored.length).toBe(first.attachment.byteSize);
		expect(first.attachment.width).toBe(2);
		expect(first.attachment.height).toBe(2);
		const thumbnail = yield* transcriptThumbnail(stored);
		expect(new TextDecoder().decode(thumbnail.slice(0, 4))).toBe("RIFF");
		expect(new TextDecoder().decode(thumbnail.slice(8, 12))).toBe("WEBP");
		const repeated = yield* prepare(root, { ...draft, id: SessionInputId.make("00000000-0000-4000-8000-000000000042") });
		expect(repeated.parts[0]).toEqual(first);
	}),
);

it.effect("rejects unreadable, excessive, and incorrectly ordered uploads", () =>
	Effect.gen(function* () {
		const root = yield* temporary;
		const corrupt = yield* Effect.flip(prepare(root, { ...draft, parts: [{ ...image, bytes: new Uint8Array([1, 2, 3]) }] }));
		expect(corrupt).toMatchObject({ _tag: "InvalidInput", reason: "corrupt_image" });
		const excessive = yield* Effect.flip(
			prepare(root, { ...draft, parts: [{ ...image, bytes: new Uint8Array(MAX_SESSION_IMAGE_SOURCE_BYTES + 1) }] }),
		);
		expect(excessive).toMatchObject({ _tag: "InvalidInput", reason: "image_too_large" });
		const order = yield* Effect.flip(prepare(root, { ...draft, parts: [{ type: "text", text: "words" }, image] }));
		expect(order).toMatchObject({ _tag: "InvalidInput", reason: "invalid_order" });
	}),
);

it.effect("retains original request identity separately from normalized image identity", () =>
	Effect.sync(() => {
		const same = digestRequest(draft.sessionId, draft.parts);
		expect(digestRequest(draft.sessionId, draft.parts)).toBe(same);
		expect(digestRequest("another-root", draft.parts)).not.toBe(same);
		expect(digestRequest(draft.sessionId, [{ ...image, name: "renamed.png" }, draft.parts[1]])).not.toBe(same);
		expect(digestRequest(draft.sessionId, [{ ...image, declaredMediaType: "image/png" }, draft.parts[1]])).not.toBe(same);
	}),
);
