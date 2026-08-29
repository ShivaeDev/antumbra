import { SightSource } from "@antumbra/contract";
import { SessionFabric } from "@antumbra/session-fabric";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { eventually, payload } from "#test/session-recovery-fixture.ts";
import {
	onlyWake,
	opensWhenSpokenTo,
	sessionRow,
	sleepingRoot,
	wakeLayer,
} from "#test/session-wake-fixture.ts";

// why: the deadlock this whole path was rebuilt for. A resume used to wait for
// the provider's opening frame before it said anything, and a provider whose
// model reads a stream of input has nothing to open about until it is spoken
// to — so both sides waited, the wake died on its patience, and the admiral's
// words went nowhere against a process that was alive the whole time. Speaking
// first is what breaks it; a double that can withhold its opening is what makes
// the break provable rather than asserted.
it.live(
	"a resume speaks first to a provider that opens on being spoken to",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const { recorded, scripted } = yield* sleepingRoot(temporary);
			const backend = opensWhenSpokenTo(scripted.backend, scripted);

			yield* Effect.gen(function* () {
				const fabric = yield* SessionFabric;
				const sight = yield* SightSource;
				yield* sight.send(payload.sessionId, "come about");
				yield* eventually(
					Effect.gen(function* () {
						expect((yield* onlyWake).status).toBe("succeeded");
						expect((yield* sessionRow).executionStatus).toBe("active");
					}),
				);
				const resumed = yield* scripted.session(payload.sessionId);
				expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
					"come about",
				]);
				expect(yield* fabric.holds(payload.sessionId)).toBe(true);
			}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner)));
		}),
);
