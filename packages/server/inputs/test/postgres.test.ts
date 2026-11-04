import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
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
	function* ({ api, legacyInputSession, replayJournal, inputsHistory, rebuild, published, clearPublished }) {
		const { legacy, sessionId } = yield* legacyInputSession();
		yield* replayJournal(legacy);
		const draft = {
			id: id("41"),
			sessionId,
			parts: [
				{ type: "image" as const, name: "reef.png", bytes },
				{ type: "text" as const, text: "Describe the reef" },
			],
		} as const;
		expect(yield* api["inputs.submit"](draft)).toEqual({ id: draft.id, status: "accepted" });
		const held = yield* api["inputs.reading"]({ id: draft.id, sessionId });
		expect(held).toMatchObject({
			status: "accepted",
			parts: [{ type: "image", attachment: { mediaType: "image/png", width: 2, height: 2 } }, { text: "Describe the reef" }],
		});
		const image = yield* api["inputs.image"]({ sessionId, inputId: draft.id, position: 0 });
		expect(new TextDecoder().decode(image.bytes.slice(0, 4))).toBe("RIFF");
		yield* rebuild();
		expect(yield* api["inputs.reading"]({ id: draft.id, sessionId })).toEqual(held);
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
		expect(yield* api["inputs.reading"]({ id: id("42"), sessionId })).toBeNull();
		expect(yield* inputsHistory.read()).toEqual(before);
		expect(yield* published()).toEqual([]);
	},
);

postgresApp.it("replays a real accepted journal input then accepts another submission", [], function* ({ api, legacyInputSession, replayJournal }) {
	const { legacy, runner, sessionId } = yield* legacyInputSession();
	const draft = { id: id("51"), sessionId, parts: [{ type: "text" as const, text: "Continue sounding" }] } as const;
	const pending = yield* legacy.inputs.submit(draft).pipe(Effect.forkScoped);
	const operation = yield* runner.next;
	if (operation.type !== "Deliver") return yield* Effect.die(new Error(`Expected Deliver, got ${operation.type}`));
	yield* runner.append([
		{ logId: "log:input-story", cursor: 2, at: 0, event: { type: "InputAccepted", requestId: operation.requestId, sessionId, inputId: draft.id } },
	]);
	yield* runner.reply(operation.requestId, { type: "Accepted" });
	expect(yield* Fiber.join(pending)).toEqual({ id: draft.id, status: "accepted" });
	const original = yield* answered(legacy.api.inputs.reading({ id: draft.id, sessionId }), "accepted input");
	yield* replayJournal(legacy);
	expect(yield* api["inputs.reading"]({ id: draft.id, sessionId })).toEqual(original);
	expect(yield* api["inputs.submit"]({ ...draft, id: id("52") })).toEqual({ id: id("52"), status: "accepted" });
});

postgresApp.it(
	"keeps input rows and refreshes invisible until commit and discards rollback",
	[],
	function* ({ api, legacyInputSession, replayJournal, inputsHistory, transaction, rollback, published, clearPublished }) {
		const { legacy, sessionId } = yield* legacyInputSession();
		yield* replayJournal(legacy);
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
		expect(yield* api["inputs.reading"]({ id: event.id, sessionId })).toBeNull();
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* api["inputs.reading"]({ id: event.id, sessionId })).toMatchObject({ status: "pending" });
		expect(yield* published()).toEqual(
			expect.arrayContaining(["sessionInput", `sessionInput:${sessionId}`, "sessionOperation", `sessionOperation:${sessionId}`]),
		);
		yield* clearPublished();
		yield* rollback(inputsHistory.append(Request.make("rollback-input"), [{ ...event, id: id("62") }]));
		expect(yield* api["inputs.reading"]({ id: id("62"), sessionId })).toBeNull();
		expect(yield* published()).toEqual([]);
	},
);
