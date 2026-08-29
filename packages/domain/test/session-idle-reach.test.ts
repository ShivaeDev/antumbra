import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { SessionInputId } from "@antumbra/vocabulary/session-input";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	makeScriptedBackend,
	sessionFor,
	standDown,
} from "#test/harness.ts";
import {
	HAND,
	openedNatively,
	presenceOf,
	sessionRow,
	sightLayer,
	spawned,
} from "#test/session-idle-fixture.ts";
import { eventually, untilTerminal } from "#test/session-recovery-fixture.ts";

// why: wake-on-send. An asleep root is resumed through the machinery a hail
// already uses, and the words the admiral sent are what it is told on arrival —
// one act, no separate wake control to find.
it.live("a send to an asleep root resumes it and delivers the words", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			yield* spawned;
			const first = yield* openedNatively(scripted);
			yield* callTool(first, "stand_down", undefined);
			// why: the siesta is asked for directly, standing in for the hour the
			// clock would otherwise have to pass — the threshold itself is proved
			// on its own beside this, and this rehearsal is about waking.
			const siesta = yield* kernel.submit(domain.siesta, {
				sessionId: HAND.sessionId,
			});
			expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* first.closed).toBe(true);
				}),
			);
			expect((yield* presenceOf).presence).toBe("asleep");
			expect((yield* presenceOf).canSend).toBe(true);

			yield* sight.send(HAND.sessionId, "come about");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
				}),
			);
			const resumed = yield* sessionFor(scripted, HAND.agentId);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* resumed.sent).toEqual(["come about"]);
					expect((yield* sessionRow).executionStatus).toBe("active");
				}),
			);
			const reopened = (yield* scripted.opened)[1];
			expect(reopened?.resume).toEqual(Option.some("native-idle"));
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live(
	"an asleep root wakes from an input id and receives its durable image",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const kernel = yield* Kernel;
				const sight = yield* SightSource;
				yield* spawned;
				const first = yield* openedNatively(scripted);
				yield* callTool(first, "stand_down", undefined);
				const siesta = yield* kernel.submit(domain.siesta, {
					sessionId: HAND.sessionId,
				});
				expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* first.closed).toBe(true);
					}),
				);
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
				expect(wakes.every((intent) => !intent.payload.includes("iVBOR"))).toBe(
					true,
				);
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* scripted.opened).toHaveLength(2);
					}),
				);
				const resumed = yield* sessionFor(scripted, HAND.agentId);
				yield* eventually(
					Effect.gen(function* () {
						const received = yield* resumed.received;
						expect(received.at(-1)?.parts.map((part) => part.type)).toEqual([
							"image",
							"text",
						]);
					}),
				);
			}).pipe(Effect.provide(sightLayer(temporary, scripted)));
		}),
);

// why: retirement is the one state that refuses, and it refuses with a typed
// error rather than by going quiet.
it.live("a send to a retired agent's session refuses", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* standDown(scripted, HAND.agentId);
			yield* sight.retire(HAND.agentId);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* live.closed).toBe(true);
					expect((yield* sessionRow).status).toBe("closed");
				}),
			);
			expect((yield* presenceOf).canSend).toBe(false);
			expect((yield* presenceOf).presence).toBe("ended");
			const refused = yield* Effect.flip(
				sight.send(HAND.sessionId, "still aboard?"),
			);
			expect(refused.message).toContain("has ended");
			const ghost = yield* Effect.flip(sight.send("ghost", "anyone aboard?"));
			expect(ghost.message).toContain("no session ghost");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: a Session is addressed by its root. Making send state-aware widened what
// it will do, never what it will do it to — a child's conversation is one its
// parent is still holding, and nothing outside may speak into it.
it.live("a send addressed at a subsession is still refused", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
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
			const refused = yield* Effect.flip(
				sight.send("session-idle-child", "answer me directly"),
			);
			expect(refused.message).toContain("subsession");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: idleness is only ever true of a live process, so a restart necessarily
// leaves an idle Session asleep. Boot must read that as an ordinary resumable
// Session — not a failure, and not something to resume unasked — and the send
// is what brings it back.
it.live("a restart leaves an idle session asleep until it is spoken to", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* callTool(live, "stand_down", undefined);
			expect((yield* sessionRow).executionStatus).toBe("idle");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			// why: nothing may wake it on its own — not boot, not a projection,
			// not the passage of a demand pass.
			yield* Effect.sleep(100);
			expect(yield* scripted.opened).toHaveLength(1);
			const asleep = yield* presenceOf;
			expect(asleep.presence).toBe("asleep");
			expect(asleep.canSend).toBe(true);
			expect((yield* sessionRow).status).toBe("open");

			yield* sight.send(HAND.sessionId, "report your position");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
					const resumed = yield* sessionFor(scripted, HAND.agentId);
					expect(yield* resumed.sent).toEqual(["report your position"]);
				}),
			);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
