import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { SessionFabric, SessionFabricLive } from "@antumbra/session-fabric";
import { makeSessionTurnRests } from "@antumbra/sessions";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { domainKernelLayer, sightSourceTestLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, rawOf, type ScriptedBackend } from "#test/harness.ts";
import { DEFAULT_IDLE_SIESTA_AFTER_MILLIS, HAND, openedNatively, passedAt, presenceOf, sessionRow, spawned } from "#test/session-idle-fixture.ts";
import { reportsNativeRef } from "#test/session-recovery-fixture.ts";
import { eventually } from "#test/voyage-fixtures.ts";

const spoke: AgentEvent = {
	raw: rawOf("agent/message"),
	role: "agent",
	text: "on it",
	type: "message",
};

const completed: AgentEvent = {
	durationMs: 1200,
	raw: rawOf("turn/completed"),
	status: "completed",
	type: "turn.completed",
};

const strandLayer = (temporary: Parameters<typeof domainKernelLayer>[0], scripted: ScriptedBackend) =>
	sightSourceTestLayer.pipe(
		Layer.provideMerge(SessionFabricLive),
		Layer.provideMerge(domainKernelLayer(temporary, reportsNativeRef(scripted.backend, scripted, "native-idle"))),
	);

const wakes = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/wake" }).all();
});

it.live("a session whose process went mid-turn strands and stays stranded", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const fabric = yield* SessionFabric;
			yield* spawned;
			yield* openedNatively(scripted);
			expect((yield* presenceOf).presence).toBe("working");

			yield* fabric.stop(HAND.sessionId);
			const lost = yield* presenceOf;
			expect(lost.presence).toBe("stranded");
			expect(lost.canSend).toBe(true);
			expect((yield* sessionRow).executionStatus).toBe("active");

			yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
			expect(yield* wakes).toEqual([]);
			expect((yield* sessionRow).executionStatus).toBe("active");
			expect((yield* presenceOf).presence).toBe("stranded");
		}).pipe(Effect.provide(strandLayer(temporary, scripted)));
	}),
);

it.live("an ending that lands after the attachment went still settles", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const fabric = yield* SessionFabric;
			const turnRestFor = yield* makeSessionTurnRests;
			yield* spawned;
			const turns = yield* turnRestFor(HAND.sessionId);
			yield* turns.observed(spoke);

			yield* fabric.stop(HAND.sessionId);
			yield* turns.observed(completed);
			expect((yield* sessionRow).executionStatus).toBe("idle");
		}).pipe(Effect.provide(strandLayer(temporary, scripted)));
	}),
);

it.live("an ending is refused when a newer attachment holds the session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const fabric = yield* SessionFabric;
			const sight = yield* SightSource;
			const turnRestFor = yield* makeSessionTurnRests;
			yield* spawned;
			yield* openedNatively(scripted);
			const turns = yield* turnRestFor(HAND.sessionId);
			yield* turns.observed(spoke);

			yield* fabric.stop(HAND.sessionId);
			yield* sight.send(HAND.sessionId, "take it back up");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* fabric.holds(HAND.sessionId)).toBe(true);
				}),
			);

			yield* turns.observed(completed);
			expect((yield* sessionRow).executionStatus).toBe("active");
		}).pipe(Effect.provide(strandLayer(temporary, scripted)));
	}),
);
