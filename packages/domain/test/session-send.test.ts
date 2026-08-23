import { existsSync } from "node:fs";
import { SightSource } from "@antumbra/contract";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { SessionInputId } from "@antumbra/vocabulary/session-input";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Schedule } from "effect";
import { SightSourceLive } from "#sight.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	type ScriptedBackend,
	type ScriptedSession,
} from "#test/harness.ts";

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

const sightLayer = (
	temporary: TemporaryPersistence,
	scripted: ScriptedBackend,
) =>
	SightSourceLive.pipe(
		Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)),
	);

const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

const liveSession = (scripted: ScriptedBackend, sessionId: string) =>
	eventually(
		scripted
			.session(sessionId)
			.pipe(
				Effect.flatMap((live) =>
					live === undefined
						? Effect.fail("not live yet")
						: Effect.succeed(live),
				),
			),
	);

// why: the charter is itself a queued delivery, so a test only knows what the
// admiral added once the session has been told what it was spawned for.
const chartered = (session: ScriptedSession) =>
	eventually(
		Effect.gen(function* () {
			expect(yield* session.sent).toEqual([spawnRequest.charter]);
		}),
	);

it.live("the admiral's words reach the live session's queue", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const session = yield* liveSession(scripted, receipt.sessionId);
			yield* chartered(session);
			yield* sight.send(receipt.sessionId, "steer for the reef");
			expect(yield* session.sent).toEqual([
				spawnRequest.charter,
				"steer for the reef",
			]);
			expect(yield* session.steered).toEqual([]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live(
	"an ordered image input reaches the agent once through durable custody",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const sight = yield* SightSource;
				const receipt = yield* sight.spawn(spawnRequest);
				const session = yield* liveSession(scripted, receipt.sessionId);
				yield* chartered(session);
				const id = SessionInputId.make("00000000-0000-4000-8000-000000000041");
				const bytes = new Uint8Array(
					Buffer.from(
						"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNwzHz4H4QZYAwAVhYKKeA4Rd8AAAAASUVORK5CYII=",
						"base64",
					),
				);
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
				expect(delivered?.parts.map((part) => part.type)).toEqual([
					"image",
					"text",
				]);
				const image = delivered?.parts[0];
				expect(image?.type === "image" && existsSync(image.path)).toBe(true);
				expect(yield* sight.sendInput(request)).toEqual({
					id,
					status: "accepted",
				});
				expect(yield* session.received).toHaveLength(received.length);
			}).pipe(Effect.provide(sightLayer(temporary, scripted)));
		}),
);

it.live("a message with no words is refused before any delivery", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const session = yield* liveSession(scripted, receipt.sessionId);
			yield* chartered(session);
			const refusal = yield* Effect.flip(sight.send(receipt.sessionId, "  \n"));
			expect(refusal._tag).toBe("SightFailure");
			expect(refusal.message).toContain("no words");
			expect(yield* session.sent).toEqual([spawnRequest.charter]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: losing an attachment is not losing reachability — a Session whose
// process went away is woken by being spoken to. The two refusals left are the
// ones where there is nothing to wake: an identity that has ended, and an id
// that never named a Session at all.
it.live("only an ended session and an unknown id refuse the message", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			const session = yield* liveSession(scripted, receipt.sessionId);
			yield* chartered(session);
			yield* sight.retire(receipt.agentId);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* session.closed).toBe(true);
				}),
			);
			const ended = yield* Effect.flip(
				sight.send(receipt.sessionId, "still aboard?"),
			);
			expect(ended.message).toContain("has ended and cannot be spoken to");
			const ghost = yield* Effect.flip(sight.send("ghost", "anyone aboard?"));
			expect(ghost.message).toContain("there is no session ghost on the fleet");
			expect(yield* session.sent).toEqual([spawnRequest.charter]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
