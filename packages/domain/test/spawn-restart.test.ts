import {
	type IntentStatus,
	isTerminalIntentStatus,
	Kernel,
} from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { AgentBackend } from "@antumbra/plugin-api";
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

const payload: SpawnFields = {
	agentId: "agent-running",
	backend: "scripted",
	charter: "survive the restart",
	pieceId: "piece-running",
	role: "test hand",
	runner: "local",
	sessionId: "session-running",
};

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil(isTerminalIntentStatus),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const blockFirstOpen = (
	backend: AgentBackend,
	opening: Deferred.Deferred<void>,
	first: Ref.Ref<boolean>,
): AgentBackend => ({
	...backend,
	openSession: (options) =>
		Ref.getAndSet(first, false).pipe(
			Effect.flatMap((block) =>
				block
					? Deferred.succeed(opening, undefined).pipe(
							Effect.andThen(Effect.never),
						)
					: backend.openSession(options),
			),
		),
});

it.live(
	"boot requeues a running spawn without reclaiming its ready berth",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const opening = yield* Deferred.make<void>();
			const first = yield* Ref.make(true);
			const backend = blockFirstOpen(scripted.backend, opening, first);
			const intentId = yield* Effect.gen(function* () {
				const db = yield* Database;
				const kernel = yield* Kernel;
				const domain = yield* AgentDomain;
				yield* domain.repos.register({
					defaultRef: "main",
					source: "/somewhere/running",
				});
				const submission = yield* kernel.submit(domain.spawn, payload);
				yield* Deferred.await(opening);
				expect(
					Option.getOrThrow(
						yield* db.Berth.where({ agentId: payload.agentId }).first(),
					).status,
				).toBe("ready");
				expect(
					Option.getOrThrow(
						yield* db.Agent.where({ id: payload.agentId }).first(),
					).currentSessionId,
				).toBe(payload.sessionId);
				return submission.id;
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, backend, {}, recorded.runner),
				),
			);
			expect(
				yield* Effect.gen(function* () {
					const db = yield* Database;
					return Option.getOrThrow(
						yield* db.Intent.where({ id: intentId }).first(),
					).status;
				}).pipe(Effect.provide(temporary.layer)),
			).toBe("running");
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const kernel = yield* Kernel;
				expect(yield* untilTerminal(kernel.changes(intentId))).toBe(
					"succeeded",
				);
				expect(
					Option.getOrThrow(
						yield* db.Agent.where({ id: payload.agentId }).first(),
					),
				).toMatchObject({
					currentSessionId: payload.sessionId,
					status: "alive",
				});
				expect((yield* recorded.provisioned)[1]).toEqual(
					(yield* recorded.provisioned)[0],
				);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, backend, {}, recorded.runner),
				),
			);
		}),
);
