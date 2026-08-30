import { SettingsSource, SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { acquireTemporaryPersistence, callTool, makeScriptedBackend } from "#test/harness.ts";
import { HAND, openedNatively, passedAt, presenceOf, sessionRow, sightLayer, spawned } from "#test/session-idle-fixture.ts";
import { eventually, untilTerminal } from "#test/session-recovery-fixture.ts";

// why: the whole point of the correction. Saying "nothing to do" used to be the
// same act as being put away, so an Agent that had finished was an Agent that
// could not be spoken to. It stays where it was, and the next words find it
// there — no resume, no second provider session opened.
it.live("standing down keeps the acquisition, and the next words need no resume", () =>
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
it.live("the configured idle threshold controls when siesta begins", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const settings = yield* SettingsSource;
			yield* settings.change({ key: "idleSiestaMinutes", value: 5 });
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* callTool(live, "stand_down", undefined);
			expect((yield* sessionRow).executionStatus).toBe("idle");

			// why: a minute short of the chosen threshold the pass runs in full and
			// still finds nothing to reclaim — the setting is a floor, not a hint.
			yield* passedAt(4 * 60_000);
			expect(yield* db.Intent.where({ tag: "session/siesta" }).all()).toEqual([]);
			expect(yield* live.closed).toBe(false);

			yield* passedAt(6 * 60_000);
			const demanded = yield* db.Intent.where({ tag: "session/siesta" }).all();
			expect(demanded).toHaveLength(1);
			// why: the Agent asked for none of this. The demand names the Session
			// the clock chose, and the rehearsal follows that one intent to rest.
			expect(demanded[0]?.payload).toContain(HAND.sessionId);
			expect(yield* untilTerminal(kernel.changes(demanded[0]?.id ?? ""))).toBe("succeeded");

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
