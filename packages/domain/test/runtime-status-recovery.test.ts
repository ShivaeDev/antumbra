import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import {
	eventually,
	payload,
	seedResumableAgent,
	waitingRecovery,
} from "#test/session-recovery-fixture.ts";

it.live("an unknown Agent status becomes visible held recovery truth", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(
			temporary,
			scripted.backend,
			recorded.runner,
			scripted,
		);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.Agent.where({ id: payload.agentId }).update({
					status: "future-agent",
				}),
			);
		}).pipe(Effect.provide(temporary.layer));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const held = yield* eventually(waitingRecovery);
			expect(held.detail).toContain("stored Agent agent-resume");
			expect(held.detail).toContain("future-agent");
			const agent = Option.getOrThrow(
				yield* db.Agent.where({ id: payload.agentId }).first(),
			);
			expect(agent.status).toBe("future-agent");
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, recorded.runner),
			),
		);
	}),
);

it.live("a reclaimed Berth is valid recovery truth that is not ready", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(
			temporary,
			scripted.backend,
			recorded.runner,
			scripted,
		);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.Berth.where({ agentId: payload.agentId }).update({
					status: "reclaimed",
				}),
			);
		}).pipe(Effect.provide(temporary.layer));

		yield* Effect.gen(function* () {
			const held = yield* eventually(waitingRecovery);
			expect(held.detail).toContain("waiting for its ready Berths");
			expect(held.detail).not.toContain("invalid Berth status");
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, recorded.runner),
			),
		);
	}),
);
