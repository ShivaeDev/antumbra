import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Queue, Stream } from "effect";
import { rawOf, type ScriptedSession } from "#test/harness.ts";
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

const CHILD = "native-child";

const delegates = (live: ScriptedSession) =>
	live.emit({
		raw: rawOf("subsession/opened"),
		spawnedBy: "tool-1",
		subsessionRef: CHILD,
		type: "subsession.opened",
	});

const finishes = (live: ScriptedSession) =>
	live.emit({
		outcome: "completed",
		raw: rawOf("subsession/ended"),
		subsessionRef: CHILD,
		type: "subsession.ended",
	});

const restingAt = (canSleep: boolean) =>
	Effect.gen(function* () {
		const sight = yield* SightSource;
		yield* sight.fleetFeed.pipe(
			Stream.map((fleet) => fleet.agents.flatMap((agent) => agent.sessions).find((session) => session.id === HAND.sessionId)),
			Stream.filter((session) => session?.presence === "idle" && session.canSleep === canSleep),
			Stream.runHead,
		);
	});

const siestaIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "session/siesta" }).all();
});

it.effectApp.withProviders("the fleet updates rest eligibility as delegated conversations start and finish", idleBackend, function* (_, scripted) {
	const sight = yield* SightSource;
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);
	const readings = yield* Queue.unbounded<boolean | undefined>();
	yield* sight.fleetFeed.pipe(
		Stream.map((fleet) => fleet.agents.flatMap((agent) => agent.sessions).find((session) => session.id === HAND.sessionId)?.canSleep),
		Stream.changes,
		Stream.runForEach((canSleep) => Queue.offer(readings, canSleep)),
		Effect.forkChild,
	);
	expect(yield* Queue.take(readings)).toBe(true);

	yield* delegates(live);
	expect(yield* Queue.take(readings)).toBe(false);

	yield* finishes(live);
	expect(yield* Queue.take(readings)).toBe(true);
});

it.effectApp.withProviders("the admiral's request rests a session through the clock's own act", idleBackend, function* (_, scripted) {
	const kernel = yield* Kernel;
	const sight = yield* SightSource;
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);
	yield* restingAt(true);

	yield* sight.sleep(HAND.sessionId);
	const asked = yield* siestaIntents;
	expect(asked).toHaveLength(1);
	expect(asked[0]?.payload).toContain(HAND.sessionId);
	expect(yield* untilTerminal(kernel.changes(asked[0]?.id ?? ""))).toBe("succeeded");

	expect(yield* live.closed).toBe(true);
	const row = yield* sessionRow;
	expect(row.status).toBe("open");
	expect(row.executionStatus).toBe("idle");
	expect(row.nativeRef).toBe("native-idle");
	expect((yield* presenceOf).presence).toBe("asleep");
});

it.effectApp.withProviders("a request that races a child starting refuses and names itself", idleBackend, function* (_, scripted) {
	const kernel = yield* Kernel;
	const sight = yield* SightSource;
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* endsTurn(scripted, HAND.sessionId);
	yield* restingAt(true);

	yield* delegates(live);
	yield* restingAt(false);
	yield* sight.sleep(HAND.sessionId);
	const asked = yield* siestaIntents;
	expect(asked).toHaveLength(1);
	expect(yield* untilTerminal(kernel.changes(asked[0]?.id ?? ""))).toBe("failed");

	const refused = yield* siestaIntents;
	expect(refused[0]?.detail).toContain("delegated conversation");
	expect(yield* live.closed).toBe(false);
	expect((yield* presenceOf).presence).toBe("idle");
});

it.effectApp.withProviders("the clock waits for the tree before it reclaims", idleBackend, function* (_, scripted) {
	const kernel = yield* Kernel;
	yield* spawned;
	const live = yield* openedNatively(scripted);
	yield* delegates(live);
	yield* endsTurn(scripted, HAND.sessionId);
	yield* restingAt(false);

	yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
	expect(yield* siestaIntents).toEqual([]);
	expect(yield* live.closed).toBe(false);

	yield* finishes(live);
	yield* restingAt(true);
	yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
	const demanded = yield* siestaIntents;
	expect(demanded).toHaveLength(1);
	expect(yield* untilTerminal(kernel.changes(demanded[0]?.id ?? ""))).toBe("succeeded");
	expect(yield* live.closed).toBe(true);
});
