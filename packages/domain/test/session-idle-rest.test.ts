import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Clock, Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { IDLE_SIESTA_AFTER_MILLIS } from "#session-idle.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	makeScriptedBackend,
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

const NANOS_PER_MILLI = 1_000_000n;

// why: the pass reads the clock once and judges every mark against that one
// moment, so running it with a clock further on is the same fact as the time
// having gone by. Simulating the hour instead would put several hundred
// background passes in the way, each crossing the database, and no count of
// yields can promise they have all finished before the reading is taken.
const aheadBy = (millis: number) =>
	Clock.clockWith((clock) =>
		Effect.succeed<Clock.Clock>({
			currentTimeMillis: Effect.map(
				clock.currentTimeMillis,
				(now) => now + millis,
			),
			currentTimeMillisUnsafe: () => clock.currentTimeMillisUnsafe() + millis,
			currentTimeNanos: Effect.map(
				clock.currentTimeNanos,
				(now) => now + BigInt(millis) * NANOS_PER_MILLI,
			),
			currentTimeNanosUnsafe: () =>
				clock.currentTimeNanosUnsafe() + BigInt(millis) * NANOS_PER_MILLI,
			monotonicTimeNanos: clock.monotonicTimeNanos,
			monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
			sleep: (duration) => clock.sleep(duration),
		}),
	);

// why: the demand pass the app runs on its own timer, run by hand instead, so
// the rehearsal awaits the pass rather than waiting for one to come around.
const siestaPass = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find(
		(registration) => registration.tag === "session/siesta",
	);
	return demand === undefined
		? yield* Effect.die("no siesta demand is registered")
		: demand.pass;
});

const passedAt = (millis: number) =>
	Effect.gen(function* () {
		const pass = yield* siestaPass;
		const clock = yield* aheadBy(millis);
		yield* pass.pipe(Effect.provideService(Clock.Clock, clock));
	});

// why: the whole point of the correction. Saying "nothing to do" used to be the
// same act as being put away, so an Agent that had finished was an Agent that
// could not be spoken to. It stays where it was, and the next words find it
// there — no resume, no second provider session opened.
it.live(
	"standing down keeps the acquisition, and the next words need no resume",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const sight = yield* SightSource;
				yield* spawned;
				const live = yield* openedNatively(scripted);

				expect(yield* callTool(live, "stand_down", undefined)).toEqual({
					ok: true,
					text: "standing by",
				});
				yield* eventually(
					Effect.gen(function* () {
						expect((yield* sessionRow).executionStatus).toBe("idle");
					}),
				);
				expect(yield* live.closed).toBe(false);
				const idle = yield* presenceOf;
				expect(idle.presence).toBe("idle");
				expect(idle.canSend).toBe(true);
				expect(idle.canInterrupt).toBe(false);

				yield* sight.send(HAND.sessionId, "one more thing");
				expect(yield* live.sent).toEqual([HAND.charter, "one more thing"]);
				// why: one provider session for the whole exchange is the evidence
				// that nothing was torn down and rebuilt behind the words.
				expect(yield* scripted.opened).toHaveLength(1);
				expect((yield* sessionRow).executionStatus).toBe("active");
				expect((yield* presenceOf).presence).toBe("working");
			}).pipe(Effect.provide(sightLayer(temporary, scripted)));
		}),
);

// why: the clock puts a Session to siesta, never the Agent. The row is already
// idle and stays idle — reclaiming the process changes who is listening, not
// what the record says — so the Session remains open and resumable throughout.
it.live("an idle session crosses into siesta at the threshold", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* callTool(live, "stand_down", undefined);
			expect((yield* sessionRow).executionStatus).toBe("idle");

			// why: a minute short of the threshold the pass runs in full and still
			// finds nothing to reclaim — the hour is a floor, not a hint.
			yield* passedAt(IDLE_SIESTA_AFTER_MILLIS - 60_000);
			expect(yield* db.Intent.where({ tag: "session/siesta" }).all()).toEqual(
				[],
			);
			expect(yield* live.closed).toBe(false);

			yield* passedAt(IDLE_SIESTA_AFTER_MILLIS + 60_000);
			const demanded = yield* db.Intent.where({ tag: "session/siesta" }).all();
			expect(demanded).toHaveLength(1);
			// why: the Agent asked for none of this. The demand names the Session
			// the clock chose, and the rehearsal follows that one intent to rest.
			expect(demanded[0]?.payload).toContain(HAND.sessionId);
			expect(yield* untilTerminal(kernel.changes(demanded[0]?.id ?? ""))).toBe(
				"succeeded",
			);

			expect(yield* live.closed).toBe(true);
			// why: the process is gone and the record is untouched — the Session is
			// still open, still idle, and still names the conversation to resume.
			const row = yield* sessionRow;
			expect(row.status).toBe("open");
			expect(row.executionStatus).toBe("idle");
			expect(row.nativeRef).toBe("native-idle");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
