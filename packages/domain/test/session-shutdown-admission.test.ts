import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { AgentBackend } from "@antumbra/plugin-api";
import { drainActiveSessions } from "@antumbra/sessions";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#spawn.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";
import { eventually } from "#test/voyage-fixtures.ts";

const spawn = (suffix: string): SpawnFields => ({
	agentId: `shutdown-agent-${suffix}`,
	backend: "scripted",
	charter: `shutdown charter ${suffix}`,
	role: "hand",
	runner: "local",
	sessionId: `shutdown-session-${suffix}`,
});

const holdRetryStart = (
	backend: AgentBackend,
	resumed: Deferred.Deferred<void>,
	release: Deferred.Deferred<void>,
): AgentBackend => ({
	...backend,
	openSession: (options) => {
		if (options.sessionId !== "shutdown-session-retry") {
			return backend.openSession(options);
		}
		return Deferred.succeed(resumed, undefined).pipe(
			Effect.andThen(Deferred.await(release)),
			Effect.andThen(backend.openSession(options)),
		);
	},
});

it.live("includes an admitted Session start in the shutdown drain", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const startEntered = yield* Deferred.make<void>();
		const releaseStart = yield* Deferred.make<void>();
		const backend: AgentBackend = {
			...scripted.backend,
			openSession: (options) =>
				Deferred.succeed(startEntered, undefined).pipe(
					Effect.andThen(Deferred.await(releaseStart)),
					Effect.andThen(scripted.backend.openSession(options)),
				),
		};
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(domain.spawn, spawn("admitted"));
			yield* Deferred.await(startEntered);
			const shutdown = yield* drainActiveSessions.pipe(Effect.forkChild);
			yield* Effect.yieldNow;
			yield* Effect.yieldNow;
			expect(shutdown.pollUnsafe()).toBeUndefined();
			const starting = Option.getOrThrow(
				yield* db.AgentSession.where({
					id: "shutdown-session-admitted",
				}).first(),
			);
			expect(starting.executionStatus).toBe("active");

			yield* Deferred.succeed(releaseStart, undefined);
			expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
			yield* Fiber.join(shutdown);
			const session = Option.getOrThrow(
				yield* db.AgentSession.where({
					id: "shutdown-session-admitted",
				}).first(),
			);
			expect(session.executionStatus).toBe("idle");
			const live = yield* scripted.session(session.id);
			expect(live).toBeDefined();
			expect(live === undefined ? false : yield* live.closed).toBe(true);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
	}),
);

it.live(
	"releases a Session start waiting on the closed generation after drain failure",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const retryResumed = yield* Deferred.make<void>();
			const releaseRetry = yield* Deferred.make<void>();
			const backend = holdRetryStart(
				scripted.backend,
				retryResumed,
				releaseRetry,
			);
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const kernel = yield* Kernel;
				const first = yield* kernel.submit(domain.spawn, spawn("first"));
				expect(yield* untilTerminal(first.changes)).toBe("succeeded");
				yield* db.AgentSession.where({ id: "shutdown-session-first" }).update({
					executionStatus: "paused",
				});
				yield* domain.closeSessionStarts;
				const retry = yield* kernel.submit(domain.spawn, spawn("retry"));
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* recorded.provisioned).toHaveLength(2);
					}),
				);
				yield* Effect.yieldNow;
				yield* Effect.yieldNow;
				const waiting = Option.getOrThrow(
					yield* db.Agent.where({ id: "shutdown-agent-retry" }).first(),
				);
				expect(waiting.status).toBe("spawning");
				expect(
					yield* db.AgentSession.where({
						id: "shutdown-session-retry",
					}).first(),
				).toEqual(Option.none());
				expect(yield* scripted.opened).toHaveLength(1);
				expect(yield* Deferred.isDone(retryResumed)).toBe(false);

				const failure = yield* Effect.flip(drainActiveSessions);
				expect(failure._tag).toBe("InvalidSessionExecutionStatus");
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* Deferred.isDone(retryResumed)).toBe(true);
					}),
				);

				yield* db.AgentSession.where({ id: "shutdown-session-first" }).update({
					executionStatus: "active",
				});
				yield* Deferred.succeed(releaseRetry, undefined);
				yield* eventually(
					Effect.gen(function* () {
						expect(yield* scripted.opened).toHaveLength(2);
					}),
				);
				expect(yield* untilTerminal(retry.changes)).toBe("succeeded");
				yield* drainActiveSessions;
				expect(
					(yield* db.AgentSession.all()).map(
						(session) => session.executionStatus,
					),
				).toEqual(["idle", "idle"]);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, backend, {}, recorded.runner),
				),
			);
		}),
);
