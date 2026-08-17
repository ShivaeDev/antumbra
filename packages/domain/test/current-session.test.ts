import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Option, Ref, Schedule, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

const payload: SpawnFields = {
	agentId: "agent-one-current-session",
	backend: "scripted",
	charter: "own exactly one current execution",
	role: "test hand",
	runner: "local",
	sessionId: "session-first",
};

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

const blockFirstProvision = (
	runner: Runner,
	provisioning: Deferred.Deferred<void>,
	release: Deferred.Deferred<void>,
	first: Ref.Ref<boolean>,
): Runner => ({
	...runner,
	provision: (plan) =>
		Ref.getAndSet(first, false).pipe(
			Effect.flatMap((isFirst) =>
				isFirst
					? Deferred.succeed(provisioning, undefined).pipe(
							Effect.andThen(Deferred.await(release)),
							Effect.andThen(runner.provision(plan)),
						)
					: runner.provision(plan),
			),
		),
});

const seedLegacySessions = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	yield* writer.write(
		db.Agent.create({
			charter: "resume only the newest execution",
			currentSessionId: null,
			id: "agent-legacy",
			role: "test hand",
			status: "alive",
		}).pipe(
			Effect.andThen(
				Effect.forEach(["session-a", "session-b"], (sessionId) =>
					db.AgentSession.create({
						agentId: "agent-legacy",
						backend: "scripted",
						charterDeliveredAt: new Date(1),
						createdAt: new Date(1),
						cwd: "/tmp/agent-legacy",
						executionStatus: "active",
						id: sessionId,
						nativeRef: `native-${sessionId}`,
						status: "open",
					}),
				),
			),
		),
	);
});

it.live("a concurrent birth cannot give one Agent two Sessions", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const provisioning = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const first = yield* Ref.make(true);
		const runner = blockFirstProvision(
			recorded.runner,
			provisioning,
			release,
			first,
		);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const domain = yield* AgentDomain;
			const firstBirth = yield* kernel.submit(domain.spawn, payload);
			yield* Deferred.await(provisioning);
			const secondBirth = yield* kernel.submit(domain.spawn, {
				...payload,
				sessionId: "session-second",
			});
			expect(yield* untilTerminal(secondBirth.changes)).toBe("failed");
			yield* Deferred.succeed(release, undefined);
			expect(yield* untilTerminal(firstBirth.changes)).toBe("succeeded");
			const sessions = yield* db.AgentSession.all();
			expect(sessions.map((session) => session.id)).toEqual(["session-first"]);
			expect(
				Option.getOrThrow(
					yield* db.Agent.where({ id: payload.agentId }).first(),
				).currentSessionId,
			).toBe("session-first");
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, runner),
			),
		);
	}),
);

it.live("boot selects only the newest legacy open Session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedLegacySessions.pipe(Effect.provide(temporary.layer));
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			yield* eventually(
				Effect.gen(function* () {
					const intents = yield* db.Intent.where({
						tag: "agent/recover",
					}).all();
					expect(intents).toHaveLength(1);
					const recovered = yield* domain.recover.decode(
						Option.getOrThrow(Option.fromUndefinedOr(intents[0])).payload,
					);
					expect(recovered.sessionId).toBe("session-b");
				}),
			);
			const agent = Option.getOrThrow(
				yield* db.Agent.where({ id: "agent-legacy" }).first(),
			);
			expect(agent.currentSessionId).toBe("session-b");
			expect(
				(yield* db.AgentSession.all()).map((session) => [
					session.id,
					session.status,
				]),
			).toEqual([
				["session-a", "closed"],
				["session-b", "open"],
			]);
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, recorded.runner),
			),
		);
	}),
);
