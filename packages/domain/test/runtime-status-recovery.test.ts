import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";
import { eventually, hail, payload, seedResumableAgent, waitingWake } from "#test/session-recovery-fixture.ts";

it.live("a reclaimed Berth is valid durable truth that is not ready", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.Berth.where({ agentId: payload.agentId }).update({
				status: "reclaimed",
			});
		}).pipe(Effect.provide(temporary.layer));

		yield* Effect.gen(function* () {
			yield* hail(payload.sessionId);
			const held = yield* eventually(waitingWake);
			expect(held.detail).toContain("waiting for its ready Berths");
			expect(held.detail).not.toContain("invalid Berth status");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend, {}, recorded.runner)));
	}),
);
