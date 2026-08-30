import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
	acquireTemporaryPersistence,
	callTool,
	makeScriptedBackend,
	rawOf,
	type ScriptedSession,
} from "#test/harness.ts";
import {
	DEFAULT_IDLE_SIESTA_AFTER_MILLIS,
	HAND,
	laterBy,
	openedNatively,
	passedAt,
	presenceOf,
	sessionRow,
	sightLayer,
	spawned,
} from "#test/session-idle-fixture.ts";
import { eventually, untilTerminal } from "#test/session-recovery-fixture.ts";

const CHILD = "native-child";

// why: the shape a provider uses to say a turn handed work to a delegated
// conversation. Only the reference and the call that spawned it matter here —
// the rest of the tree's bookkeeping is rehearsed where the tree is.
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

// why: the whole tree rides the root's one acquisition, so a Session that has
// said it is finished is not at rest while something it delegated is still
// speaking. The act is withheld rather than offered and refused, because the
// admiral could do nothing about a child mid-sentence anyway.
it.live(
	"rest is withheld while a delegated conversation is still speaking",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				yield* spawned;
				const live = yield* openedNatively(scripted);
				yield* delegates(live);
				yield* callTool(live, "stand_down", undefined);

				// why: the root's own row says idle and the reader still sees no rest
				// on offer — which is the whole difference this predicate makes.
				yield* restingAt(false);
				expect((yield* sessionRow).executionStatus).toBe("idle");

				yield* finishes(live);
				yield* restingAt(true);
			}).pipe(Effect.provide(sightLayer(temporary, scripted)));
		}),
);

// why: one machinery, two callers. The admiral's request is the clock's own
// act asked for early, so it leaves exactly the state the threshold would —
// the process gone, the record untouched and still resumable.
it.live(
	"the admiral's request rests a session through the clock's own act",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const kernel = yield* Kernel;
				const sight = yield* SightSource;
				yield* spawned;
				const live = yield* openedNatively(scripted);
				yield* callTool(live, "stand_down", undefined);
				yield* restingAt(true);

				yield* sight.sleep(HAND.sessionId);
				const asked = yield* siestaIntents;
				expect(asked).toHaveLength(1);
				expect(asked[0]?.payload).toContain(HAND.sessionId);
				expect(yield* untilTerminal(kernel.changes(asked[0]?.id ?? ""))).toBe(
					"succeeded",
				);

				expect(yield* live.closed).toBe(true);
				const row = yield* sessionRow;
				expect(row.status).toBe("open");
				expect(row.executionStatus).toBe("idle");
				expect(row.nativeRef).toBe("native-idle");
				expect((yield* presenceOf).presence).toBe("asleep");
			}).pipe(Effect.provide(sightLayer(temporary, scripted)));
		}),
);

// why: the capability was read from a snapshot, so the button can always be a
// moment behind the tree. The act asks the question again against the present
// and refuses by name — the Session stays awake and the record says why.
it.live("a request that races a child starting refuses and names itself", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* callTool(live, "stand_down", undefined);
			yield* restingAt(true);

			yield* delegates(live);
			yield* restingAt(false);
			yield* sight.sleep(HAND.sessionId);
			const asked = yield* siestaIntents;
			expect(asked).toHaveLength(1);
			expect(yield* untilTerminal(kernel.changes(asked[0]?.id ?? ""))).toBe(
				"failed",
			);

			// why: a refusal nobody can read is the silent success this guards
			// against, so the reason is on the row that asked.
			const refused = yield* siestaIntents;
			expect(refused[0]?.detail).toContain("delegated conversation");
			expect(yield* live.closed).toBe(false);
			expect((yield* presenceOf).presence).toBe("idle");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: the threshold measures quiet, not the last time quiet was mentioned.
// Some Agents stand down again every time they are hailed and find nothing to
// do, and if each declaration started the wait over, the one Session that says
// it most often would be the one never reclaimed.
it.live("standing down again does not push the idle wait out", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* callTool(live, "stand_down", undefined);
			yield* restingAt(true);

			yield* laterBy(50 * 60_000, callTool(live, "stand_down", undefined));

			yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 5 * 60_000);
			const demanded = yield* siestaIntents;
			expect(demanded).toHaveLength(1);
			expect(yield* untilTerminal(kernel.changes(demanded[0]?.id ?? ""))).toBe(
				"succeeded",
			);
			expect(yield* live.closed).toBe(true);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: the threshold is not licence to sever a tree. The clock asks for the same
// rest the admiral does and waits behind the same rule, so a root left idle
// overnight with a child still running is passed over until the child ends.
it.live("the clock waits for the tree before it reclaims", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* delegates(live);
			yield* callTool(live, "stand_down", undefined);
			yield* restingAt(false);

			yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
			expect(yield* siestaIntents).toEqual([]);
			expect(yield* live.closed).toBe(false);

			yield* finishes(live);
			yield* restingAt(true);
			yield* passedAt(DEFAULT_IDLE_SIESTA_AFTER_MILLIS + 60_000);
			const demanded = yield* siestaIntents;
			expect(demanded).toHaveLength(1);
			expect(yield* untilTerminal(kernel.changes(demanded[0]?.id ?? ""))).toBe(
				"succeeded",
			);
			expect(yield* live.closed).toBe(true);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
