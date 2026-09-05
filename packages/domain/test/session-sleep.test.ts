import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { acquireTemporaryPersistence, endTurn, makeScriptedBackend, rawOf, type ScriptedSession } from "#test/harness.ts";
import {
	DEFAULT_IDLE_SIESTA_AFTER_MILLIS,
	HAND,
	openedNatively,
	passedAt,
	presenceOf,
	sessionRow,
	sightLayer,
	spawned,
} from "#test/session-idle-fixture.ts";
import { eventually, untilTerminal } from "#test/session-recovery-fixture.ts";

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
	eventually(
		Effect.gen(function* () {
			const summary = yield* presenceOf;
			expect(summary.presence).toBe("idle");
			expect(summary.canSleep).toBe(canSleep);
		}),
	);

const siestaIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "session/siesta" }).all();
});

it.live("rest is withheld while a delegated conversation is still speaking", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* delegates(live);
			yield* endTurn(scripted, HAND.agentId);

			yield* restingAt(false);

			yield* finishes(live);
			yield* restingAt(true);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("the admiral's request rests a session through the clock's own act", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* endTurn(scripted, HAND.agentId);
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
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("a request that races a child starting refuses and names itself", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* endTurn(scripted, HAND.agentId);
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
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("the clock waits for the tree before it reclaims", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* delegates(live);
			yield* endTurn(scripted, HAND.agentId);
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
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
