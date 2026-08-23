import { SightSource } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import {
	eventually,
	payload,
	refuseWhile,
	reportsNativeRef,
} from "#test/session-recovery-fixture.ts";
import {
	NATIVE,
	onlyRecovery,
	recoveries,
	sessionRow,
	sleepingRoot,
	wakeLayer,
} from "#test/session-wake-fixture.ts";

// why: the live report this pins. Four sends went out over two days, each one
// met a wake parked from the first, and each pushed that row — so the Session
// heard a two-day-old sentence four times and never heard a word the admiral
// had actually just typed. A retry re-runs the payload as written, so newer
// words can only travel on a row of their own.
it.live("a later send delivers the words it was given, not the parked ones", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(
			reportsNativeRef(scripted.backend, scripted, NATIVE),
			denied,
		);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.send(payload.sessionId, "steer for the reef");
			const parked = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.status).toBe("waiting");
					return row;
				}),
			);

			yield* Ref.set(denied, false);
			yield* sight.send(payload.sessionId, "and mind the shallows");
			const rows = yield* eventually(
				Effect.gen(function* () {
					const all = yield* recoveries;
					expect(all.map((row) => row.status).sort()).toEqual([
						"cancelled",
						"succeeded",
					]);
					return all;
				}),
			);
			// why: the demand that carried the stale words is cancelled rather than
			// left parked, because a wake still waiting can still fire them.
			expect(rows.find((row) => row.id === parked.id)?.status).toBe("cancelled");
			expect((yield* sessionRow).executionStatus).toBe("active");
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
				"and mind the shallows",
			]);
		}).pipe(Effect.provide(wakeLayer(temporary, refusing, recorded.runner)));
	}),
);

// why: the same words twice are the same demand, and pushing the row that is
// there is what says so. Replacing it would leave a cancelled demand behind for
// nothing and read as two acts where the admiral made one.
it.live("a send repeating itself pushes the wake that is already there", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(
			reportsNativeRef(scripted.backend, scripted, NATIVE),
			denied,
		);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.send(payload.sessionId, "steer for the reef");
			const parked = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.status).toBe("waiting");
					return row;
				}),
			);

			yield* Ref.set(denied, false);
			yield* sight.send(payload.sessionId, "steer for the reef");
			const settled = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyRecovery;
					expect(row.status).toBe("succeeded");
					return row;
				}),
			);
			expect(settled.id).toBe(parked.id);
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
				"steer for the reef",
			]);
		}).pipe(Effect.provide(wakeLayer(temporary, refusing, recorded.runner)));
	}),
);
