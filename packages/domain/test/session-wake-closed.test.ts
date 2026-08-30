import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";
import { eventually, payload, refuseWhile, reportsNativeRef } from "#test/session-recovery-fixture.ts";
import { NATIVE, onlyWake, sleepingRoot, wakeLayer } from "#test/session-wake-fixture.ts";

const closeRoot = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.AgentSession.where({ id: payload.sessionId }).update({
		status: "closed",
	});
});

// why: the permanently undeliverable wake. A Session that closes after its wake
// parked can never be reached — the send that would push the wake refuses on the
// closed Session first, and boot reclaim only requeues what was running — so the
// row sat in "waiting" for ever with the admiral's words inside it and the fleet
// showed a demand that was going nowhere. Refusing the send is also the moment
// the system learns the Session is over, so it is where the wake is settled.
it.live("a wake for a closed Session settles instead of waiting", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(reportsNativeRef(scripted.backend, scripted, NATIVE), denied);

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.send(payload.sessionId, "steer for the reef");
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* onlyWake).status).toBe("waiting");
				}),
			);

			yield* closeRoot;
			yield* Effect.flip(sight.send(payload.sessionId, "and mind the shallows"));
			const settled = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyWake;
					expect(row.status).toBe("failed");
					return row;
				}),
			);
			expect(settled.detail).toContain("has closed");
		}).pipe(Effect.provide(wakeLayer(temporary, refusing, recorded.runner)));
	}),
);

// why: the refusal that settles a wake has to be the Session's own, not a
// pointer's. Read as "not the current Session" a closed root told the wake to
// wait for a pointer that can never come back to it, which is exactly how a
// demand nothing could meet kept looking pending.
it.live("a closed Session refuses a wake rather than parking it again", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { recorded, scripted } = yield* sleepingRoot(temporary);
		const backend = reportsNativeRef(scripted.backend, scripted, NATIVE);

		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			yield* closeRoot;
			yield* kernel.submit(domain.wake, { sessionId: payload.sessionId });
			const refused = yield* eventually(
				Effect.gen(function* () {
					const row = yield* onlyWake;
					expect(row.status).toBe("failed");
					return row;
				}),
			);
			expect(refused.detail).toContain("has closed");
		}).pipe(Effect.provide(wakeLayer(temporary, backend, recorded.runner)));
	}),
);
