import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
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
