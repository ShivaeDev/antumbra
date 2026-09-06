import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { endsTurn, it } from "@antumbra/testing";
import { SessionInputId } from "@antumbra/vocabulary/session-input.ts";
import { it as effectIt, expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, sessionFor } from "#test/harness.ts";
import { HAND, idleBackend, openedNatively, presenceOf, sessionRow, sightLayer, spawned } from "#test/session-idle-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

const wakeCompleted = Effect.gen(function* () {
	const db = yield* Database;
	const kernel = yield* Kernel;
	const wakes = yield* db.Intent.where({ tag: "agent/wake" }).all();
	expect(wakes).toHaveLength(1);
	expect(yield* untilTerminal(kernel.changes(wakes[0]!.id))).toBe("succeeded");
});

it.effectApp.withProviders("a send to an asleep root resumes it and delivers the words", idleBackend, function* (_, scripted) {
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const sight = yield* SightSource;
	yield* spawned;
	const first = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);
	const siesta = yield* kernel.submit(domain.siesta, {
		sessionId: HAND.sessionId,
	});
	expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");
	expect(yield* first.closed).toBe(true);
	expect((yield* presenceOf).presence).toBe("asleep");
	expect((yield* presenceOf).canSend).toBe(true);

	yield* sight.send(HAND.sessionId, "come about");
	yield* wakeCompleted;
	expect(yield* scripted.opened).toHaveLength(2);
	const resumed = yield* sessionFor(scripted, HAND.agentId);
	expect(yield* resumed.sent).toEqual(["come about"]);
	expect((yield* sessionRow).executionStatus).toBe("active");
	const reopened = (yield* scripted.opened)[1];
	expect(reopened?.resume).toEqual(Option.some("native-idle"));
});

it.effectApp.withProviders("an asleep root wakes from an input id and receives its durable image", idleBackend, function* (_, scripted) {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const sight = yield* SightSource;
	yield* spawned;
	const first = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);
	const siesta = yield* kernel.submit(domain.siesta, {
		sessionId: HAND.sessionId,
	});
	expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");
	expect(yield* first.closed).toBe(true);
	const id = SessionInputId.make("00000000-0000-4000-8000-000000000042");
	const bytes = new Uint8Array(
		Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
			"base64",
		),
	);
	expect(
		yield* sight.sendInput({
			id,
			parts: [
				{ bytes, name: "wake.png", type: "image" },
				{ text: "what woke you?", type: "text" },
			],
			sessionId: HAND.sessionId,
		}),
	).toEqual({ id, status: "queued_for_wake" });
	const wakes = yield* db.Intent.where({
		tag: "agent/wake",
	}).all();
	expect(wakes.some((intent) => intent.payload.includes(id))).toBe(true);
	expect(wakes.every((intent) => !intent.payload.includes("iVBOR"))).toBe(true);
	yield* wakeCompleted;
	expect(yield* scripted.opened).toHaveLength(2);
	const resumed = yield* sessionFor(scripted, HAND.agentId);
	const received = yield* resumed.received;
	expect(received.at(-1)?.parts.map((part) => part.type)).toEqual(["image", "text"]);
});

it.effectApp.withProviders("a send to a retired agent's session refuses", idleBackend, function* (_, scripted) {
	const sight = yield* SightSource;
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);
	yield* sight.retire(HAND.agentId);
	const db = yield* Database;
	const kernel = yield* Kernel;
	const retired = Option.getOrThrow(yield* db.Intent.where({ tag: "agent/retire" }).first());
	expect(yield* untilTerminal(kernel.changes(retired.id))).toBe("succeeded");
	expect(yield* live.closed).toBe(true);
	expect((yield* sessionRow).status).toBe("closed");
	expect((yield* presenceOf).canSend).toBe(false);
	expect((yield* presenceOf).presence).toBe("ended");
	const refused = yield* Effect.flip(sight.send(HAND.sessionId, "still aboard?"));
	expect(refused.message).toContain("has ended");
	const ghost = yield* Effect.flip(sight.send("ghost", "anyone aboard?"));
	expect(ghost.message).toContain("no session ghost");
});

it.effectApp.withProviders("a send addressed at a subsession is still refused", idleBackend, function* (_, scripted) {
	const db = yield* Database;
	const sight = yield* SightSource;
	yield* spawned;
	yield* openedNatively(scripted);
	yield* db.AgentSession.create({
		agentId: HAND.agentId,
		backend: "scripted",
		createdAt: new Date(2),
		cwd: "/tmp/agent-idle",
		executionStatus: "active",
		id: "session-idle-child",
		kind: "task",
		label: "sound the reef",
		nativeRef: "native-idle-child",
		parentSessionId: HAND.sessionId,
		rootSessionId: HAND.sessionId,
		status: "open",
	} satisfies NewAgentSession);
	const refused = yield* Effect.flip(sight.send("session-idle-child", "answer me directly"));
	expect(refused.message).toContain("subsession");
});

effectIt.live("a restart leaves an idle session asleep until it is spoken to", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* spawned;
			yield* openedNatively(scripted);
			yield* endsTurn(scripted, HAND.sessionId);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			expect(yield* scripted.opened).toHaveLength(1);
			const asleep = yield* presenceOf;
			expect(asleep.presence).toBe("asleep");
			expect(asleep.canSend).toBe(true);
			expect((yield* sessionRow).status).toBe("open");

			yield* sight.send(HAND.sessionId, "report your position");
			yield* wakeCompleted;
			expect(yield* scripted.opened).toHaveLength(2);
			const resumed = yield* sessionFor(scripted, HAND.agentId);
			expect(yield* resumed.sent).toEqual(["report your position"]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
