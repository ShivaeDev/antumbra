import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import {
	type AgentBackend,
	BackendFailure,
	type Runner,
} from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Option, Schedule, Stream } from "effect";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#domain.ts";
import type { RetireFields, SpawnFields } from "#index.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	makeScriptedRunner,
	rawOf,
} from "#test/harness.ts";

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

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
			const outcome = yield* submitSpawn(spawnPayload("a"));
			expect(outcome).toBe("succeeded");
			const agent = yield* db.Agent.where({ id: "agent-a" }).first();
			expect(Option.getOrThrow(agent).status).toBe("alive");
			const session = yield* db.AgentSession.where({ id: "session-a" }).first();
			expect(Option.getOrThrow(session).charterDeliveredAt).not.toBeNull();
			const live = yield* scripted.session("session-a");
			expect(live).toBeDefined();
			if (live === undefined) {
				return;
			}
			expect(yield* live.sent).toEqual(["charter for a"]);
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
			yield* eventually(
				Effect.gen(function* () {
					const events = yield* db.SessionEvent.where({
						sessionId: "session-a",
					}).all();
					expect(events.map((event) => event.kind)).toEqual([
						"session.opened",
						"message",
					]);
					const session = yield* db.AgentSession.where({
						id: "session-a",
					}).first();
					expect(Option.getOrThrow(session).nativeRef).toBe(
						"provider-thread-1",
					);
					expect(Option.getOrThrow(session).backend).toBe("scripted");
				}),
			);
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
			provision: (request) =>
				Deferred.succeed(provisioning, undefined).pipe(
					Effect.andThen(Deferred.await(release)),
					Effect.andThen(recorded.runner.provision(request)),
				),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			const submission = yield* kernel.submit(
				domain.spawn,
				spawnPayload("phase"),
			);
			yield* Deferred.await(provisioning);
			const pending = yield* db.Agent.where({ id: "agent-phase" }).first();
			expect(Option.getOrThrow(pending).status).toBe("spawning");
			expect(
				Option.isNone(
					yield* db.AgentSession.where({ id: "session-phase" }).first(),
				),
			).toBe(true);
			yield* Deferred.succeed(release, undefined);
			expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
			const alive = yield* db.Agent.where({ id: "agent-phase" }).first();
			expect(Option.getOrThrow(alive).status).toBe("alive");
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, runner),
			),
		);
	}),
);

it.live("a failed spawn becomes dormant without hiding its failure", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const backend: AgentBackend = {
			...scripted.backend,
			openSession: () =>
				Effect.fail(
					new BackendFailure({ detail: "open denied", tag: "scripted" }),
				),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/repo",
			});
			const submission = yield* kernel.submit(
				domain.spawn,
				spawnPayload("failed"),
			);
			expect(yield* untilTerminal(submission.changes)).toBe("failed");
			const agent = yield* db.Agent.where({ id: "agent-failed" }).first();
			expect(Option.getOrThrow(agent).status).toBe("dormant");
			const session = yield* db.AgentSession.where({
				id: "session-failed",
			}).first();
			expect(Option.getOrThrow(session).status).toBe("closed");
			const berths = yield* db.Berth.where({ agentId: "agent-failed" }).all();
			expect(berths.map((berth) => berth.status)).toEqual(["ready"]);
			const intent = yield* db.Intent.where({ id: submission.id }).first();
			expect(Option.getOrThrow(intent).detail).toContain("open denied");
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, backend, {}, recorded.runner),
			),
		);
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
			const first = yield* submitRetire({ agentId: "agent-c" });
			expect(first).toBe("succeeded");
			const agent = yield* db.Agent.where({ id: "agent-c" }).first();
			expect(Option.getOrThrow(agent).status).toBe("retired");
			const session = yield* db.AgentSession.where({ id: "session-c" }).first();
			expect(Option.getOrThrow(session).status).toBe("closed");
			const live = yield* scripted.session("session-c");
			expect(live !== undefined && (yield* live.closed)).toBe(true);
			const again = yield* submitRetire({ agentId: "agent-c" });
			expect(again).toBe("succeeded");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("boot reclaim marks agents the last life left alive as dormant", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* submitSpawn(spawnPayload("d"));
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		const live = yield* scripted.session("session-d");
		expect(live !== undefined && (yield* live.closed)).toBe(true);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const agent = yield* db.Agent.where({ id: "agent-d" }).first();
			expect(Option.getOrThrow(agent).status).toBe("dormant");
			const session = yield* db.AgentSession.where({ id: "session-d" }).first();
			expect(Option.getOrThrow(session).status).toBe("closed");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("the alive-agents gauge tracks births and deaths", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const gauge = domain.gauges[AGENTS_ALIVE_GAUGE] ?? Effect.succeed(-1);
			expect(yield* gauge).toBe(0);
			yield* submitSpawn(spawnPayload("e"));
			expect(yield* gauge).toBe(1);
			yield* submitRetire({ agentId: "agent-e" });
			expect(yield* gauge).toBe(0);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
