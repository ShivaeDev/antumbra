import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
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

// why: the shape every provider uses to say the turn it was running is over.
// None of them require the Agent to have said anything about it, and one of
// them gives its Agents no way to say anything at all.
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

// why: the whole correction. An Agent that ends its turn without declaring
// anything has still stopped, and a record that waits for a declaration leaves
// it working forever — presence says so and rest never comes. The ending is the
// fact, and nothing is asked of the Agent to make it one.
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

			// why: settling says what the Session is doing, never who is still
			// listening — the acquisition stays exactly where it was.
			expect(yield* live.closed).toBe(false);
			const idle = yield* presenceOf;
			expect(idle.presence).toBe("idle");
			expect(idle.canSend).toBe(true);
			expect(idle.canInterrupt).toBe(false);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: stopping and declaring stay two acts. The log holds the ending the
// provider sent and nothing more — no declaration is minted from it — and an
// Agent that does declare afterwards is answered as it always was, on a row its
// own ending has already settled.
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

// why: words are the end of having nothing to do, whichever act began the
// quiet. The mark a turn ending left is cleared by them exactly as a
// declaration's would be, so the threshold never reaches a Session that has
// been given something to do.
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
			expect(yield* live.sent).toEqual([HAND.charter, "one more thing"]);

			yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
			expect(yield* siestaIntents).toEqual([]);
			expect(yield* live.closed).toBe(false);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: an ending can arrive after the words that began the next turn — the
// provider was finishing the last one while the admiral was speaking. Settling
// on it would put a Session that is working back to rest, so an ending words
// have overtaken is discarded. Only that one: the turn now under way ends the
// way any other does.
it.live("an ending overtaken by new words leaves the session working", () =>
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

			yield* completes(live);
			yield* Effect.sleep(100);
			expect((yield* sessionRow).executionStatus).toBe("active");
			expect((yield* presenceOf).presence).toBe("working");

			yield* speaks(live);
			yield* completes(live);
			yield* settled;
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: the tree rides the root's one acquisition, so a root whose own turn is
// over is still not at rest while a child it delegated to is speaking. The
// ending settles the execution column and says nothing about the tree, and the
// clock waits behind the same rule it always did.
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
