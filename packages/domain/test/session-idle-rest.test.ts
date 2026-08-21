import { SightSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { IDLE_SIESTA_AFTER_MILLIS } from "#session-idle.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	makeScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import {
	HAND,
	openedNatively,
	presenceOf,
	sessionRow,
	sightLayer,
	spawned,
} from "#test/session-idle-fixture.ts";
import { eventually } from "#test/session-recovery-fixture.ts";

// why: under a controlled clock nothing runs unless time is moved, so the
// rehearsal moves it and then lets every fiber the move woke reach its own
// next wait before reading anything.
const settled = (millis: number) =>
	TestClock.adjust(millis).pipe(
		Effect.andThen(Effect.repeat(Effect.yieldNow, { times: 50 })),
	);

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
it.effect("an idle session crosses into siesta at the threshold", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* spawned;
			const live = yield* sessionFor(scripted, HAND.agentId);
			yield* callTool(live, "stand_down", undefined);
			expect((yield* sessionRow).executionStatus).toBe("idle");

			// why: a whole demand pass short of the threshold, so the pass has
			// certainly run and certainly declined to reclaim anything.
			yield* settled(IDLE_SIESTA_AFTER_MILLIS - 10_000);
			expect(yield* db.Intent.where({ tag: "session/siesta" }).all()).toEqual(
				[],
			);
			expect(yield* live.closed).toBe(false);

			yield* settled(20_000);
			expect(yield* live.closed).toBe(true);
			// why: the process is gone and the record is untouched — the Session is
			// still open, still idle, and still names the conversation to resume.
			const row = yield* sessionRow;
			expect(row.status).toBe("open");
			expect(row.executionStatus).toBe("idle");
			expect(
				(yield* db.Intent.where({ tag: "session/siesta" }).all()).map(
					(intent) => intent.status,
				),
			).toEqual(["succeeded"]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
