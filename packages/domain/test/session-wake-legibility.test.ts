import { SightSource } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { eventually, payload, refuseWhile, reportsNativeRef } from "#test/session-recovery-fixture.ts";
import { NATIVE, onlyWake, sessionRow, sleepingRoot, wakeChips, wakeLayer } from "#test/session-wake-fixture.ts";

it.live("a wake that cannot be taken parks with its reason on the fleet", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(reportsNativeRef(scripted.backend, scripted, NATIVE), denied);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.send(payload.sessionId, "steer for the reef");
			const parked = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyWake;
					expect(row.status).toBe("waiting");
					return row;
				}),
			);
			expect(parked.detail).toContain("authentication is required");
			expect(wakeChips(yield* sight.fleet)).toEqual([
				{
					detail: parked.detail,
					id: parked.id,
					kind: "agent/wake",
					state: "waiting",
				},
			]);
			expect((yield* sessionRow).executionStatus).toBe("idle");
		}).pipe(Effect.provide(wakeLayer(temporary, refusing, recorded.runner)));
	}),
);
