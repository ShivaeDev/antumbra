import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { payload, refuseWhile, reportsNativeRef, untilWaitingOrTerminal } from "#test/session-recovery-fixture.ts";
import { NATIVE, onlyWake, sessionRow, sleepingRoot, wakeLayer, wakes } from "#test/session-wake-fixture.ts";

// A live regression repeated a two-day-old parked payload instead of newer input.
it.live("a later send delivers its own words, not the parked ones", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(reportsNativeRef(scripted.backend, scripted, NATIVE), denied);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			const kernel = yield* Kernel;
			yield* sight.send(payload.sessionId, "steer for the reef");
			expect(yield* untilWaitingOrTerminal(kernel.changes((yield* onlyWake).id))).toBe("waiting");
			const parked = yield* onlyWake;

			yield* Ref.set(denied, false);
			yield* sight.send(payload.sessionId, "and mind the shallows");
			yield* Effect.forEach(yield* wakes, (row) => untilWaitingOrTerminal(kernel.changes(row.id)), { discard: true });
			const rows = yield* wakes;
			expect(rows.map((row) => row.status).sort()).toEqual(["cancelled", "succeeded"]);
			expect(rows.find((row) => row.id === parked.id)?.status).toBe("cancelled");
			expect((yield* sessionRow).executionStatus).toBe("active");
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual(["and mind the shallows"]);
		}).pipe(Effect.provide(wakeLayer(temporary, refusing, recorded.runner)));
	}),
);
