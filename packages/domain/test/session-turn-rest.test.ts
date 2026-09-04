import { SightSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, PubSub } from "effect";
import { acquireTemporaryPersistence, callTool, makeScriptedBackend, rawOf, type ScriptedSession } from "#test/harness.ts";
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

const completes = (live: ScriptedSession) =>
	live.emit({
		durationMs: 1200,
		raw: rawOf("turn/completed"),
		status: "completed",
		type: "turn.completed",
	});

const speaks = (live: ScriptedSession) =>
	live.emit({
		raw: rawOf("agent/message"),
		role: "agent",
		text: "on it",
		type: "message",
	});

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

const settled = eventually(
	Effect.gen(function* () {
		expect((yield* sessionRow).executionStatus).toBe("idle");
	}),
);

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

const journalKinds = Effect.gen(function* () {
	const db = yield* Database;
	const events = yield* db.SessionEvent.where({ sessionId: HAND.sessionId })
		.orderBy((event) => event.seq.asc())
		.all();
	return events.map((event) => event.kind);
});

it.live("a completed turn settles the session that was working", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* spawned;
			const live = yield* openedNatively(scripted);
			expect((yield* sessionRow).executionStatus).toBe("active");
			expect((yield* presenceOf).presence).toBe("working");

			yield* completes(live);
			yield* settled;

			expect(yield* live.closed).toBe(false);
			const idle = yield* presenceOf;
			expect(idle.presence).toBe("idle");
			expect(idle.canSend).toBe(true);
			expect(idle.canInterrupt).toBe(false);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("a turn ending is never written down as a declaration", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* completes(live);
			yield* settled;
			expect(yield* journalKinds).toEqual(["session.opened", "turn.completed"]);

			expect(yield* callTool(live, "stand_down", undefined)).toEqual({
				ok: true,
				text: "standing by",
			});
			expect((yield* sessionRow).executionStatus).toBe("idle");
			expect(yield* journalKinds).toEqual(["session.opened", "turn.completed"]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("words after a completed turn put the session back to work", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* completes(live);
			yield* settled;

			yield* sight.send(HAND.sessionId, "one more thing");
			expect((yield* sessionRow).executionStatus).toBe("active");
			expect((yield* presenceOf).presence).toBe("working");
			expect(yield* live.sent).toEqual([HAND.charter]);
			expect(yield* live.steered).toEqual(["one more thing"]);

			yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
			expect(yield* siestaIntents).toEqual([]);
			expect(yield* live.closed).toBe(false);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("an ending overtaken by new words leaves the session working", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const sight = yield* SightSource;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* completes(live);
			yield* settled;

			yield* sight.send(HAND.sessionId, "one more thing");
			expect((yield* sessionRow).executionStatus).toBe("active");

			const events = yield* feeds.subscribeSessionEvents();
			yield* completes(live);
			yield* speaks(live);
			expect((yield* PubSub.take(events)).kind).toBe("turn.completed");
			expect((yield* PubSub.take(events)).kind).toBe("message");
			expect((yield* sessionRow).executionStatus).toBe("active");
			expect((yield* presenceOf).presence).toBe("working");

			yield* completes(live);
			yield* settled;
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

it.live("the tree still holds back rest after the root's turn ends", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* delegates(live);
			yield* completes(live);
			yield* settled;
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
