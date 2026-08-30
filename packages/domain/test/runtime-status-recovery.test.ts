import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";
import { eventually, hail, payload, seedResumableAgent, waitingWake } from "#test/session-recovery-fixture.ts";

it.live("an unknown Agent status becomes a visible held wake", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.Agent.where({ id: payload.agentId }).update({
				status: "future-agent",
			});
		}).pipe(Effect.provide(temporary.layer));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* hail(payload.sessionId);
			const held = yield* eventually(waitingWake);
			expect(held.detail).toContain("stored Agent agent-resume");
			expect(held.detail).toContain("future-agent");
			const agent = Option.getOrThrow(yield* db.Agent.where({ id: payload.agentId }).first());
			expect(agent.status).toBe("future-agent");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend, {}, recorded.runner)));
	}),
);

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
