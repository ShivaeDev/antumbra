import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { type AgentBackend, BackendFailure, type Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import type { RetireFields } from "#retire.ts";
import { makeSightSessionEvents } from "#sight-session-events.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner, rawOf, standDown } from "#test/harness.ts";

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));

const submitSpawn = (payload: SpawnFields) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const submission = yield* kernel.submit(domain.spawn, payload);
		return yield* untilTerminal(submission.changes);
	});

const submitRetire = (payload: RetireFields) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const submission = yield* kernel.submit(domain.retire, payload);
		return yield* untilTerminal(submission.changes);
	});

const spawnPayload = (suffix: string): SpawnFields => ({
	agentId: `agent-${suffix}`,
	backend: "scripted",
	charter: `charter for ${suffix}`,
	role: "test hand",
	runner: "local",
	sessionId: `session-${suffix}`,
});

it.live("spawn brings an agent alive, chartered, with events flowing", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const sight = yield* makeSightSessionEvents;
			const outcome = yield* submitSpawn(spawnPayload("a"));
			expect(outcome).toBe("succeeded");
			const agent = yield* db.Agent.where({ id: "agent-a" }).first();
			expect(Option.getOrThrow(agent)).toMatchObject({
				currentSessionId: "session-a",
				status: "alive",
			});
			const session = yield* db.AgentSession.where({ id: "session-a" }).first();
			expect(Option.getOrThrow(session).charterDeliveredAt).not.toBeNull();
			const live = Option.getOrThrow(Option.fromUndefinedOr(yield* scripted.session("session-a")));
			expect(yield* live.sent).toEqual(["charter for a"]);
			const collector = yield* sight
				.sessionEventFeed({ fromSeq: 0, sessionId: "session-a" })
				.pipe(Stream.take(2), Stream.runCollect, Effect.forkChild);
			yield* live.emit({
				nativeRef: "provider-thread-1",
				raw: rawOf("system/init"),
				type: "session.opened",
			});
			yield* live.emit({
				raw: rawOf("assistant"),
				role: "agent",
				text: "hi",
				type: "message",
			});
			const events = yield* Fiber.join(collector);
			expect(events.map((event) => event.event)).toMatchObject([
				{ _tag: "Known", event: { type: "session.opened" } },
				{ _tag: "Known", event: { type: "message" } },
			]);
			const persisted = Option.getOrThrow(yield* db.AgentSession.where({ id: "session-a" }).first());
			expect(persisted.nativeRef).toBe("provider-thread-1");
			expect(persisted.backend).toBe("scripted");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("spawn stays spawning until its moorage and session exist", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const provisioning = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const runner: Runner = {
			...recorded.runner,
			provision: (plan) =>
				Deferred.succeed(provisioning, undefined).pipe(Effect.andThen(Deferred.await(release)), Effect.andThen(recorded.runner.provision(plan))),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/phase",
			});
			const submission = yield* kernel.submit(domain.spawn, spawnPayload("phase"));
			yield* Deferred.await(provisioning);
			const pending = yield* db.Agent.where({ id: "agent-phase" }).first();
			expect(Option.getOrThrow(pending)).toMatchObject({
				currentSessionId: "session-phase",
				status: "spawning",
			});
			const moorage = yield* db.Moorage.where({
				agentId: "agent-phase",
			}).first();
			expect(Option.getOrThrow(moorage)).toMatchObject({
				root: "/tmp/moorage/agent-phase",
				status: "provisioning",
			});
			const plannedBerths = yield* db.Berth.where({
				agentId: "agent-phase",
			}).all();
			expect(plannedBerths).toMatchObject([{ ref: "main", source: "/somewhere/phase", status: "provisioning" }]);
			expect(Option.isNone(yield* db.AgentSession.where({ id: "session-phase" }).first())).toBe(true);
			yield* Deferred.succeed(release, undefined);
			expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
			const alive = yield* db.Agent.where({ id: "agent-phase" }).first();
			expect(Option.getOrThrow(alive).status).toBe("alive");
			expect(Option.getOrThrow(yield* db.Moorage.where({ agentId: "agent-phase" }).first()).status).toBe("ready");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend, {}, runner)));
	}),
);

it.live("a failed spawn becomes dormant without hiding its failure", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const backend: AgentBackend = {
			...scripted.backend,
			openSession: () => Effect.fail(new BackendFailure({ detail: "open denied", tag: "scripted" })),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/repo",
			});
			const submission = yield* kernel.submit(domain.spawn, spawnPayload("failed"));
			expect(yield* untilTerminal(submission.changes)).toBe("failed");
			const agent = yield* db.Agent.where({ id: "agent-failed" }).first();
			expect(Option.getOrThrow(agent)).toMatchObject({
				currentSessionId: null,
				status: "dormant",
			});
			const session = yield* db.AgentSession.where({
				id: "session-failed",
			}).first();
			expect(Option.getOrThrow(session).status).toBe("closed");
			const berths = yield* db.Berth.where({ agentId: "agent-failed" }).all();
			expect(berths.map((berth) => berth.status)).toEqual(["ready"]);
			const intent = yield* db.Intent.where({ id: submission.id }).first();
			expect(Option.getOrThrow(intent).detail).toContain("open denied");
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend, {}, recorded.runner)));
	}),
);

it.live("spawn against an unknown backend tag fails visibly", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const outcome = yield* submitSpawn({
				...spawnPayload("b"),
				backend: "nope",
			});
			expect(outcome).toBe("failed");
			const agent = yield* db.Agent.where({ id: "agent-b" }).first();
			expect(Option.isNone(agent)).toBe(true);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("retire closes the session, the rows, and is idempotent", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* submitSpawn(spawnPayload("c"));
			yield* standDown(scripted, "agent-c");
			const first = yield* submitRetire({ agentId: "agent-c" });
			expect(first).toBe("succeeded");
			const agent = yield* db.Agent.where({ id: "agent-c" }).first();
			expect(Option.getOrThrow(agent)).toMatchObject({
				currentSessionId: null,
				status: "retired",
			});
			const session = yield* db.AgentSession.where({ id: "session-c" }).first();
			expect(Option.getOrThrow(session).status).toBe("closed");
			const live = yield* scripted.session("session-c");
			expect(live !== undefined && (yield* live.closed)).toBe(true);
			const again = yield* submitRetire({ agentId: "agent-c" });
			expect(again).toBe("succeeded");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
