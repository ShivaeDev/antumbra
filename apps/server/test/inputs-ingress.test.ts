import { answered, it } from "@antumbra/app-testing/entry.ts";
import { inputApi } from "@antumbra/app-testing/inputs.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";

const sessionId = SessionId.make("session:input-ingress");
const inputId = SessionInputId.make("00000000-0000-4000-8000-000000000081");
const imageBytes = new Uint8Array(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
		"base64",
	),
);
const connect = Effect.fn("inputs.test.connect")(function* (imageInput: boolean) {
	const runner = yield* connectRunner({
		runnerId: "runner:input-ingress",
		logId: "log:input-ingress",
		backends: ["claude"],
		imageInputBackends: imageInput ? ["claude"] : [],
	});
	yield* runner.append([
		{
			logId: "log:input-ingress",
			cursor: 1,
			at: 0,
			event: {
				type: "SessionStarted",
				requestId: "start:input-ingress",
				sessionId,
				agentId: "agent:input-ingress",
				backend: "claude",
				nativeRef: "native:input-ingress",
				cwd: "/input-ingress",
				toolSetVersion: "1",
				runnerId: "runner:input-ingress",
			},
		},
	]);
	return runner;
});

it.app("publishes ordered image input through RPC and serves its thumbnail only to the owning session", function* ({ api }) {
	const runner = yield* connect(true);
	const inputs = yield* inputApi;
	const draft = {
		id: inputId,
		sessionId,
		parts: [
			{ type: "image", name: "soundings.png", bytes: imageBytes, declaredMediaType: "image/jpeg" },
			{ type: "text", text: "Describe these soundings" },
		],
	} as const;
	const submitted = yield* Effect.forkScoped(inputs.submit(draft));
	const operation = yield* runner.next;
	if (operation.type !== "Deliver") return yield* Effect.die(new Error(`Expected Deliver, got ${operation.type}`));
	expect(operation.input.parts.map((part) => part.type)).toEqual(["image", "text"]);
	const stored = yield* answered(api.inputs.reading({ sessionId, id: inputId }));
	expect(stored?.status).toBe("pending");
	const image = stored?.parts[0];
	if (image?.type !== "image") return yield* Effect.die(new Error("image metadata was not recorded"));
	expect(image.attachment.mediaType).toBe("image/png");
	expect(operation.input.parts[0]).toMatchObject({ type: "image", digest: image.attachment.digest });
	const thumbnail = yield* inputs.image({ sessionId, inputId, position: 0 });
	expect(thumbnail.mediaType).toBe("image/webp");
	expect(new TextDecoder().decode(thumbnail.bytes.slice(0, 4))).toBe("RIFF");
	expect(yield* Effect.flip(inputs.image({ sessionId: "another-session", inputId, position: 0 }))).toMatchObject({ _tag: "InputNotFound" });
	yield* runner.append([
		{
			logId: "log:input-ingress",
			cursor: 2,
			at: 1,
			event: { type: "InputAccepted", requestId: operation.requestId, sessionId, inputId },
		},
	]);
	yield* runner.reply(operation.requestId, { type: "Accepted" });
	expect(yield* Fiber.join(submitted)).toEqual({ id: inputId, status: "accepted" });
	expect(yield* inputs.submit(draft)).toEqual({ id: inputId, status: "accepted" });
	expect(yield* Effect.flip(inputs.submit({ ...draft, parts: [{ type: "text", text: "Different words" }] }))).toMatchObject({
		_tag: "InputConflict",
	});
});

it.app("retains ambiguous input evidence and refuses a same-identity retry", function* ({ api }) {
	const runner = yield* connect(false);
	const inputs = yield* inputApi;
	const draft = { id: inputId, sessionId, parts: [{ type: "text", text: "Continue sounding" }] } as const;
	const submitted = yield* Effect.forkScoped(Effect.flip(inputs.submit(draft)));
	const operation = yield* runner.next;
	if (operation.type !== "Deliver") return yield* Effect.die(new Error(`Expected Deliver, got ${operation.type}`));
	yield* runner.append([
		{
			logId: "log:input-ingress",
			cursor: 2,
			at: 1,
			event: { type: "InputAmbiguous", requestId: operation.requestId, sessionId, inputId, reason: "Provider disconnected during handoff" },
		},
	]);
	yield* runner.reply(operation.requestId, { type: "Accepted" });
	expect(yield* Fiber.join(submitted)).toMatchObject({ _tag: "InputAmbiguous", inputId });
	expect((yield* answered(api.inputs.reading({ sessionId, id: inputId })))?.status).toBe("ambiguous");
	expect(yield* Effect.flip(inputs.submit(draft))).toMatchObject({ _tag: "InputAmbiguous", inputId });
});

it.app("refuses images from a text-only backend before recording input intent", function* ({ api }) {
	yield* connect(false);
	const inputs = yield* inputApi;
	const refused = yield* Effect.flip(inputs.submit({ id: inputId, sessionId, parts: [{ type: "image", name: "soundings.png", bytes: imageBytes }] }));
	expect(refused).toMatchObject({ _tag: "InputRefused" });
	expect(yield* answered(api.inputs.reading({ sessionId, id: inputId }))).toBeNull();
});

it.app("keeps observed image capability after runner disconnect and model refresh", function* ({ api }) {
	yield* Effect.scoped(connect(true));
	expect(yield* answered(api.inputs.support({ sessionId }))).toEqual({ imageInput: true });
	yield* api.backends.listModels({ backend: "claude", failure: null, models: [] });
	expect(yield* answered(api.inputs.support({ sessionId }))).toEqual({ imageInput: true });
});

it.app("returns a durable queued receipt while provider capacity blocks delivery", function* ({ api }) {
	const runner = yield* connect(false);
	yield* runner.append([
		{
			logId: "log:input-ingress",
			cursor: 2,
			at: 1,
			event: {
				type: "CapacityObserved",
				backend: "claude",
				status: "blocked",
				reason: "usage-limit",
				detail: "Provider window exhausted",
				observedAt: 1,
				resetsAt: null,
				utilization: 1,
			},
		},
	]);
	const inputs = yield* inputApi;
	const draft = { id: inputId, sessionId, parts: [{ type: "text", text: "Continue after capacity returns" }] } as const;
	expect(yield* inputs.submit(draft)).toEqual({ id: inputId, status: "queued_for_wake" });
	expect((yield* answered(api.inputs.reading({ sessionId, id: inputId })))?.status).toBe("queued_for_wake");
	expect(yield* inputs.submit(draft)).toEqual({ id: inputId, status: "queued_for_wake" });
});

it.app("retries a known refusal with the same input identity and fresh delivery intent", function* ({ api }) {
	const runner = yield* connect(false);
	const inputs = yield* inputApi;
	const draft = { id: inputId, sessionId, parts: [{ type: "text", text: "Retry after a definite refusal" }] } as const;
	const first = yield* Effect.forkScoped(Effect.flip(inputs.submit(draft)));
	const refused = yield* runner.next;
	if (refused.type !== "Deliver") return yield* Effect.die(new Error(`Expected Deliver, got ${refused.type}`));
	yield* runner.append([
		{
			logId: "log:input-ingress",
			cursor: 2,
			at: 1,
			event: { type: "InputFailed", requestId: refused.requestId, sessionId, inputId, reason: "The provider refused before handoff" },
		},
	]);
	yield* runner.reply(refused.requestId, { type: "Refused", reason: "The provider refused before handoff" });
	expect(yield* Fiber.join(first)).toMatchObject({ _tag: "InputRefused" });
	const retried = yield* Effect.forkScoped(inputs.submit(draft));
	const accepted = yield* runner.next;
	if (accepted.type !== "Deliver") return yield* Effect.die(new Error(`Expected Deliver, got ${accepted.type}`));
	expect(accepted.input.id).toBe(inputId);
	expect(accepted.requestId).not.toBe(refused.requestId);
	yield* runner.append([
		{
			logId: "log:input-ingress",
			cursor: 3,
			at: 2,
			event: { type: "InputFailed", requestId: refused.requestId, sessionId, inputId, reason: "Late duplicate refusal" },
		},
	]);
	expect((yield* answered(api.inputs.reading({ sessionId, id: inputId })))?.status).toBe("pending");
	yield* runner.append([
		{
			logId: "log:input-ingress",
			cursor: 4,
			at: 3,
			event: { type: "InputAccepted", requestId: accepted.requestId, sessionId, inputId },
		},
	]);
	yield* runner.reply(accepted.requestId, { type: "Accepted" });
	expect(yield* Fiber.join(retried)).toEqual({ id: inputId, status: "accepted" });
});
