import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { payload, untilTerminal } from "#test/session-recovery-fixture.ts";
import { onlyWake, opensWhenSpokenTo, sleepingRoot, wakeLayer } from "#test/session-wake-fixture.ts";

it.effect("a resume speaks first to a provider that opens on being spoken to", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const backend = opensWhenSpokenTo(scripted.backend, scripted);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.send(payload.sessionId, "come about");
			const kernel = yield* Kernel;
			expect(yield* untilTerminal(kernel.changes((yield* onlyWake).id))).toBe("succeeded");
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual(["come about"]);
		}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner)));
	}),
);
