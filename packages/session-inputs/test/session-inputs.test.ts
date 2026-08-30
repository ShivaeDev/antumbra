import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NewAgentSession } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { MAX_SESSION_IMAGE_SOURCE_BYTES, SessionInputId } from "@antumbra/vocabulary/session-input";
import { expect, it as plainIt } from "@effect/vitest";
import { Effect } from "effect";
import { SessionInputInvalid } from "#errors.ts";
import { prepareInput } from "#prepare.ts";
import { SessionInputs, SessionInputsLive } from "#session-inputs.ts";

const it = persistenceIt();
const custodyRoot = mkdtempSync(join(tmpdir(), "antumbra-session-inputs-"));
it.afterAll(() => rmSync(custodyRoot, { force: true, recursive: true }));
const id = (suffix: string) => SessionInputId.make(`00000000-0000-4000-8000-${suffix.padStart(12, "0")}`);
const image = (bytes: Uint8Array) => ({
	bytes,
	declaredMediaType: "image/png",
	name: "reef.png",
	type: "image" as const,
});

const png = () =>
	Effect.succeed(
		new Uint8Array(
			Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
				"base64",
			),
		),
	);

plainIt.effect("rejects corrupt bytes, excessive sources, and non-canonical order", () =>
	Effect.gen(function* () {
		const corrupt = yield* Effect.flip(
			prepareInput({
				id: id("1"),
				parts: [image(new Uint8Array([1, 2, 3]))],
				sessionId: "s",
			}),
		);
		expect(corrupt).toBeInstanceOf(SessionInputInvalid);
		expect(corrupt.reason).toBe("corrupt_image");
		const tooLarge = yield* Effect.flip(
			prepareInput({
				id: id("2"),
				parts: [image(new Uint8Array(MAX_SESSION_IMAGE_SOURCE_BYTES + 1))],
				sessionId: "s",
			}),
		);
		expect(tooLarge.reason).toBe("image_too_large");
		const bytes = yield* png();
		const ordered = yield* Effect.flip(
			prepareInput({
				id: id("3"),
				parts: [{ text: "words first", type: "text" }, image(bytes)],
				sessionId: "s",
			}),
		);
		expect(ordered.reason).toBe("invalid_order");
	}),
);

it.effectDB("normalizes, owns, replays, and reads durable images", function* (db) {
	const sessionId = "session-images";
	yield* db.Agent.create({
		charter: "inspect images",
		currentSessionId: sessionId,
		id: "agent-images",
		role: "inspector",
		status: "alive",
	});
	yield* db.AgentSession.create({
		agentId: "agent-images",
		backend: "codex",
		charterDeliveredAt: null,
		cwd: "/tmp/images",
		executionStatus: "active",
		id: sessionId,
		nativeRef: null,
		parentSessionId: null,
		rootSessionId: sessionId,
		status: "open",
	} satisfies NewAgentSession);
	const bytes = yield* png();
	const draft = {
		id: id("4"),
		parts: [image(bytes), { text: "what is here?", type: "text" as const }],
		sessionId,
	} as const;
	yield* Effect.gen(function* () {
		const inputs = yield* SessionInputs;
		expect(yield* inputs.ingest(draft)).toEqual({
			id: draft.id,
			status: "pending",
		});
		expect(yield* inputs.ingest(draft)).toEqual({
			id: draft.id,
			status: "pending",
		});
		const stored = yield* inputs.load(draft.id);
		expect(stored.sessionId).toBe(sessionId);
		expect(stored.input.parts.map((part) => part.type)).toEqual(["image", "text"]);
		const first = stored.input.parts[0];
		expect(first?.type === "image" && existsSync(first.path)).toBe(true);
		if (first?.type === "image") {
			expect(statSync(first.path).mode & 0o777).toBe(0o600);
		}
		const thumbnail = yield* inputs.image({
			inputId: draft.id,
			position: 0,
			sessionId,
		});
		expect(thumbnail.mediaType).toBe("image/webp");
		expect(new TextDecoder().decode(thumbnail.bytes.slice(0, 4))).toBe("RIFF");
		expect(new TextDecoder().decode(thumbnail.bytes.slice(8, 12))).toBe("WEBP");
		const hidden = yield* Effect.flip(
			inputs.image({
				inputId: draft.id,
				position: 0,
				sessionId: "another-session",
			}),
		);
		expect(hidden._tag).toBe("SessionInputNotFound");
		yield* inputs.mark(draft.id, "accepted");
		expect((yield* inputs.ingest(draft)).status).toBe("accepted");
		const conflict = yield* Effect.flip(
			inputs.ingest({
				...draft,
				parts: [image(bytes), { text: "changed", type: "text" }],
			}),
		);
		expect(conflict._tag).toBe("SessionInputConflict");
	}).pipe(Effect.provide(SessionInputsLive(custodyRoot)));
	expect(yield* db.SessionAttachment.all()).toHaveLength(1);
});
