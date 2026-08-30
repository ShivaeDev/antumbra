import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { drainActiveSessions } from "@antumbra/sessions";
import { expect, it } from "@effect/vitest";
import { Effect, ManagedRuntime, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#spawn.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner, type ScriptedBackend, type ScriptedRunner } from "#test/harness.ts";
import { eventually, payload as recoveryPayload, reportsNativeRef, seedResumableAgent, untilTerminal } from "#test/session-recovery-fixture.ts";

const WAITING_SPAWN: SpawnFields = {
	agentId: "shutdown-agent-waiting",
	backend: "scripted",
	charter: "shutdown charter waiting",
	role: "hand",
	runner: "local",
	sessionId: "shutdown-session-waiting",
};

const closeAndHoldSpawn = (scripted: ScriptedBackend, recorded: ScriptedRunner) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		yield* domain.closeSessionStarts;
		const submission = yield* kernel.submit(domain.spawn, WAITING_SPAWN);
		yield* eventually(
			Effect.gen(function* () {
				expect(yield* recorded.provisioned).toHaveLength(1);
			}),
		);
		yield* Effect.yieldNow;
		yield* Effect.yieldNow;
		const agent = Option.getOrThrow(yield* db.Agent.where({ id: WAITING_SPAWN.agentId }).first());
		expect(agent.status).toBe("spawning");
		const sessionAbsent = Option.isNone(yield* db.AgentSession.where({ id: WAITING_SPAWN.sessionId }).first());
		expect(yield* scripted.opened).toHaveLength(0);
		yield* drainActiveSessions;
		return { intentId: submission.id, sessionAbsent };
	});

const verifySpawnRebuild = (intentId: string, sessionAbsent: boolean, scripted: ScriptedBackend, recorded: ScriptedRunner) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const kernel = yield* Kernel;
		expect(yield* untilTerminal(kernel.changes(intentId))).toBe("succeeded");
		const agent = Option.getOrThrow(yield* db.Agent.where({ id: WAITING_SPAWN.agentId }).first());
		const session = Option.getOrThrow(yield* db.AgentSession.where({ id: WAITING_SPAWN.sessionId }).first());
		expect(agent.status).toBe("alive");
		expect(session.executionStatus).toBe("active");
		expect(sessionAbsent).toBe(true);
		expect(yield* scripted.opened).toHaveLength(1);
		expect(yield* recorded.provisioned).toHaveLength(2);
	});

const closeAndHoldRecovery = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		yield* domain.closeSessionStarts;
		const submission = yield* kernel.submit(domain.wake, {
			sessionId: recoveryPayload.sessionId,
		});
		yield* eventually(
			Effect.gen(function* () {
				const intent = Option.getOrThrow(yield* db.Intent.where({ id: submission.id }).first());
				expect(intent.status).toBe("running");
			}),
		);
		yield* Effect.yieldNow;
		yield* Effect.yieldNow;
		const session = Option.getOrThrow(yield* db.AgentSession.where({ id: recoveryPayload.sessionId }).first());
		expect(session.executionStatus).toBe("idle");
		expect(yield* scripted.opened).toHaveLength(1);
		yield* drainActiveSessions;
		return submission.id;
	});

const verifyRecoveryRebuild = (intentId: string, scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const kernel = yield* Kernel;
		expect(yield* untilTerminal(kernel.changes(intentId))).toBe("succeeded");
		const session = Option.getOrThrow(yield* db.AgentSession.where({ id: recoveryPayload.sessionId }).first());
		expect(session.executionStatus).toBe("active");
		expect(yield* scripted.opened).toHaveLength(2);
		const resumed = (yield* scripted.opened)[1];
		expect(resumed?.resume).toEqual(Option.some("native-durable"));
	});

it.live("rebuild requeues a post-close spawn without writing unattached Session truth", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const runtime = ManagedRuntime.make(domainKernelLayer(temporary, scripted.backend, {}, recorded.runner));
		const waiting = yield* Effect.promise(() => runtime.runPromise(closeAndHoldSpawn(scripted, recorded)));
		yield* Effect.promise(() => runtime.dispose());
		yield* verifySpawnRebuild(waiting.intentId, waiting.sessionAbsent, scripted, recorded).pipe(
			Effect.provide(domainKernelLayer(temporary, scripted.backend, {}, recorded.runner)),
		);
	}),
);

it.live("rebuild requeues a post-close recovery without waking its Session early", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		yield* Database.use((db) =>
			db.AgentSession.where({ id: recoveryPayload.sessionId }).update({
				executionStatus: "idle",
			}),
		).pipe(Effect.provide(temporary.layer));
		const backend = reportsNativeRef(scripted.backend, scripted, "native-durable");
		const runtime = ManagedRuntime.make(domainKernelLayer(temporary, backend, {}, recorded.runner));
		const intentId = yield* Effect.promise(() => runtime.runPromise(closeAndHoldRecovery(scripted)));
		yield* Effect.promise(() => runtime.dispose());
		yield* verifyRecoveryRebuild(intentId, scripted).pipe(Effect.provide(domainKernelLayer(temporary, backend, {}, recorded.runner)));
	}),
);
