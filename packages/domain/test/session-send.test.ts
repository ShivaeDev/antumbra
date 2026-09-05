import { existsSync } from "node:fs";
import { SightSource } from "@antumbra/contract";
import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { SessionInputDelivery } from "@antumbra/sessions/input-delivery/service";
import { it } from "@antumbra/testing";
import { SessionInputId } from "@antumbra/vocabulary/session-input";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { endTurn, makeScriptedBackend, type ScriptedBackend } from "#test/harness.ts";

const bytes = new Uint8Array(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
		"base64",
	),
);

const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

const awaitIntent = (tag: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const kernel = yield* Kernel;
		const intents = yield* db.Intent.where({ tag }).all();
		expect(intents).toHaveLength(1);
		const intent = Option.getOrThrow(Option.fromUndefinedOr(intents[0]));
		expect(yield* kernel.changes(intent.id).pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow))).toBe(
			"succeeded",
		);
	});

const liveSession = (scripted: ScriptedBackend, sessionId: string) =>
	Effect.gen(function* () {
		yield* awaitIntent("agent/spawn");
		return Option.getOrThrow(Option.fromUndefinedOr(yield* scripted.session(sessionId)));
	});

it.effectApp("the admiral's words steer the live session", { clock: "live" }, function* ({ scripted }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	const session = yield* liveSession(scripted, receipt.sessionId);
	expect(yield* session.sent).toEqual([spawnRequest.charter]);
	yield* sight.send(receipt.sessionId, "steer for the reef");
	expect(yield* session.sent).toEqual([spawnRequest.charter]);
	expect(yield* session.steered).toEqual(["steer for the reef"]);
});

it.effectApp("an ordered image input reaches the agent once through durable custody", { clock: "live" }, function* ({ scripted }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	const session = yield* liveSession(scripted, receipt.sessionId);
	expect(yield* session.sent).toEqual([spawnRequest.charter]);
	const id = SessionInputId.make("00000000-0000-4000-8000-000000000041");
	const request = {
		id,
		parts: [
			{
				bytes,
				declaredMediaType: "image/png",
				name: "reef.png",
				type: "image" as const,
			},
			{ text: "what is shown?", type: "text" as const },
		] as const,
		sessionId: receipt.sessionId,
	};
	expect(yield* sight.sendInput(request)).toEqual({
		id,
		status: "accepted",
	});
	const received = yield* session.received;
	const delivered = received.at(-1);
	expect(delivered?.id).toBe(id);
	expect(delivered?.parts.map((part) => part.type)).toEqual(["image", "text"]);
	const image = delivered?.parts[0];
	expect(image?.type === "image" && existsSync(image.path)).toBe(true);
	expect(yield* sight.sendInput(request)).toEqual({
		id,
		status: "accepted",
	});
	expect(yield* session.received).toHaveLength(received.length);
	const delivery = yield* SessionInputDelivery;
	expect((yield* Effect.flip(delivery.load("another-session", id)))._tag).toBe("SessionInputNotFound");
});

it.effectApp("a message with no words is refused before any delivery", { clock: "live" }, function* ({ scripted }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	const session = yield* liveSession(scripted, receipt.sessionId);
	expect(yield* session.sent).toEqual([spawnRequest.charter]);
	const refusal = yield* Effect.flip(sight.send(receipt.sessionId, "  \n"));
	expect(refusal._tag).toBe("SightFailure");
	expect(refusal.message).toContain("no words");
	expect(yield* session.sent).toEqual([spawnRequest.charter]);
});

it.effectApp("only an ended session and an unknown id refuse the message", { clock: "live" }, function* ({ scripted }) {
	const sight = yield* SightSource;
	const receipt = yield* sight.spawn(spawnRequest);
	const session = yield* liveSession(scripted, receipt.sessionId);
	expect(yield* session.sent).toEqual([spawnRequest.charter]);
	yield* endTurn(scripted, receipt.agentId);
	yield* sight.retire(receipt.agentId);
	yield* awaitIntent("agent/retire");
	expect(yield* session.closed).toBe(true);
	const ended = yield* Effect.flip(sight.send(receipt.sessionId, "still aboard?"));
	expect(ended.message).toContain("has ended and cannot be spoken to");
	const ghost = yield* Effect.flip(sight.send("ghost", "anyone aboard?"));
	expect(ghost.message).toContain("there is no session ghost on the fleet");
	expect(yield* session.sent).toEqual([spawnRequest.charter]);
});

it.effectApp.withProviders(
	"a text-only backend refuses images before durable custody",
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		return {
			providers: { backends: new Map([[scripted.backend.tag, { ...scripted.backend, capabilities: { imageInput: false } }]]) },
			state: scripted,
		};
	}),
	function* ({ db }, scripted) {
		const sight = yield* SightSource;
		const receipt = yield* sight.spawn(spawnRequest);
		const session = yield* liveSession(scripted, receipt.sessionId);
		const before = yield* session.received;
		const id = SessionInputId.make("00000000-0000-4000-8000-000000000042");
		const refusal = yield* Effect.flip(
			sight.sendInput({
				id,
				sessionId: receipt.sessionId,
				parts: [{ bytes, declaredMediaType: "image/png", name: "reef.png", type: "image" }],
			}),
		);
		expect(refusal.message).toContain("backend_text_only");
		expect(Option.isNone(yield* db.SessionInput.where({ id }).first())).toBe(true);
		expect(yield* db.SessionAttachment.all()).toHaveLength(0);
		expect(yield* session.received).toEqual(before);
	},
);
