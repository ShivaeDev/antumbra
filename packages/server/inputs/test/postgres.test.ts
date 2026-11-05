import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { invalidationKeys } from "@shivaedev/changes/keys.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";

const id = (suffix: string) => SessionInputId.make(`00000000-0000-4000-8000-0000000000${suffix}`);
const bytes = new Uint8Array(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
		"base64",
	),
);

postgresApp.it(
	"submits normalized images with readable content and rejects an invalid draft without metadata",
	[],
	function* ({ api, inputSession, inputsHistory, rebuild, published, clearPublished }) {
		const { sessionId } = yield* inputSession();
		const draft = {
			id: id("41"),
			sessionId,
			parts: [
				{ type: "image" as const, name: "reef.png", bytes },
				{ type: "text" as const, text: "Describe the reef" },
			],
		} as const;
		expect(yield* api["inputs.submit"](draft)).toEqual({ id: draft.id, status: "accepted" });
		const held = yield* answered(api["inputs.reading"]({ id: draft.id, sessionId }), "inputs.reading");
		expect(held).toMatchObject({
			status: "accepted",
			parts: [{ type: "image", attachment: { mediaType: "image/png", width: 2, height: 2 } }, { text: "Describe the reef" }],
		});
		const image = yield* api["inputs.image"]({ sessionId, inputId: draft.id, position: 0 });
		expect(new TextDecoder().decode(image.bytes.slice(0, 4))).toBe("RIFF");
		yield* rebuild();
		expect(yield* answered(api["inputs.reading"]({ id: draft.id, sessionId }), "inputs.reading")).toEqual(held);
		const before = yield* inputsHistory.read();
		yield* clearPublished();
		expect(yield* api["inputs.submit"](draft)).toEqual({ id: draft.id, status: "accepted" });
		expect(yield* Effect.flip(api["inputs.submit"]({ ...draft, parts: [{ type: "text", text: "Other words" }] }))).toMatchObject({
			_tag: "InputConflict",
		});
		expect(yield* Effect.flip(api["inputs.submit"]({ id: id("42"), sessionId, parts: [{ type: "text", text: " " }] }))).toMatchObject({
			_tag: "InvalidInput",
			reason: "empty_text",
		});
		expect(yield* answered(api["inputs.reading"]({ id: id("42"), sessionId }), "inputs.reading")).toBeNull();
		expect(yield* inputsHistory.read()).toEqual(before);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it(
	"keeps input rows and refreshes invisible until commit and discards rollback",
	[],
	function* ({ api, inputSession, inputsHistory, transaction, rollback, published, clearPublished }) {
		const { sessionId } = yield* inputSession();
		yield* clearPublished();
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const event = {
			_tag: "InputRecorded" as const,
			id: id("61"),
			sessionId,
			requestDigest: "text",
			parts: [{ type: "text" as const, text: "Sound" }] as const,
			deliveryKind: "steer" as const,
			at: 0,
		};
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* inputsHistory.append(Request.make("pending-input"), [event]);
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect(yield* answered(api["inputs.reading"]({ id: event.id, sessionId }), "inputs.reading")).toBeNull();
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* answered(api["inputs.reading"]({ id: event.id, sessionId }), "inputs.reading")).toMatchObject({ status: "pending" });
		expect(yield* published()).toEqual(
			expect.arrayContaining([
				"sessionInput",
				...invalidationKeys([{ _tag: "Bucket", collection: "sessionInput", field: "sessionId", value: sessionId }]),
				"sessionOperation",
				...invalidationKeys([{ _tag: "Bucket", collection: "sessionOperation", field: "sessionId", value: sessionId }]),
			]),
		);
		yield* clearPublished();
		yield* rollback(inputsHistory.append(Request.make("rollback-input"), [{ ...event, id: id("62") }]));
		expect(yield* answered(api["inputs.reading"]({ id: id("62"), sessionId }), "inputs.reading")).toBeNull();
		expect(yield* published()).toEqual([]);
	},
);
