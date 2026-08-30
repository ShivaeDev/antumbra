import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend } from "#test/harness.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

const payload = {
	agentId: "agent-future-session",
	backend: "scripted",
	charter: "preserve unknown durable words",
	role: "test hand",
	runner: "local",
	sessionId: "session-future-session",
};

it.live("retire never overwrites an unknown stored Session status", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const spawn = yield* kernel.submit(domain.spawn, payload);
			expect(yield* untilTerminal(spawn.changes)).toBe("succeeded");
			yield* db.AgentSession.where({ id: payload.sessionId }).update({
				status: "future-session",
			});
			const retirement = yield* kernel.submit(domain.retire, {
				agentId: payload.agentId,
			});
			expect(yield* untilTerminal(retirement.changes)).toBe("failed");
			const agent = Option.getOrThrow(yield* db.Agent.where({ id: payload.agentId }).first());
			const session = Option.getOrThrow(yield* db.AgentSession.where({ id: payload.sessionId }).first());
			expect(agent.status).toBe("alive");
			expect(session.status).toBe("future-session");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
