import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { SessionTurnRests } from "@antumbra/sessions/turn-rest/service";
import { it } from "@antumbra/testing";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { rawOf } from "#test/harness.ts";
import {
	DEFAULT_IDLE_SIESTA_AFTER_MILLIS,
	HAND,
	idleBackend,
	openedNatively,
	passedAt,
	presenceOf,
	sessionRow,
	spawned,
} from "#test/session-idle-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

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

const wakes = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/wake" }).all();
});

it.effectApp.withProviders("a session whose process went mid-turn strands and stays stranded", idleBackend, function* (_, scripted) {
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
});

it.effectApp.withProviders("an ending that lands after the attachment went still settles", idleBackend, function* () {
	const fabric = yield* SessionFabric;
	const turnRests = yield* SessionTurnRests;
	yield* spawned;
	const turns = yield* turnRests.create(HAND.sessionId, Effect.void);
	yield* turns.observed(spoke);

	yield* fabric.stop(HAND.sessionId);
	yield* turns.observed(completed);
	expect((yield* sessionRow).executionStatus).toBe("idle");
});

it.effectApp.withProviders("an ending is refused when a newer attachment holds the session", idleBackend, function* (_, scripted) {
	const fabric = yield* SessionFabric;
	const sight = yield* SightSource;
	const turnRests = yield* SessionTurnRests;
	yield* spawned;
	yield* openedNatively(scripted);
	const turns = yield* turnRests.create(HAND.sessionId, Effect.void);
	yield* turns.observed(spoke);

	yield* fabric.stop(HAND.sessionId);
	yield* sight.send(HAND.sessionId, "take it back up");
	const kernel = yield* Kernel;
	const pending = yield* wakes;
	expect(pending).toHaveLength(1);
	for (const wake of pending) {
		expect(yield* untilTerminal(kernel.changes(wake.id))).toBe("succeeded");
	}
	expect(yield* fabric.holds(HAND.sessionId)).toBe(true);

	yield* turns.observed(completed);
	expect((yield* sessionRow).executionStatus).toBe("active");
});
