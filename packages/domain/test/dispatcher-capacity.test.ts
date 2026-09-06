import { DomainFeeds } from "@antumbra/domain-feeds";
import { isTerminalIntentStatus, Kernel, maxConcurrency } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { makeBackendCapacityController } from "@antumbra/plugin-api";
import { BackendCapacities } from "@antumbra/provider-capacity";
import { endsTurn } from "@antumbra/testing";
import { expect, it } from "@effect/vitest";
import { Clock, Deferred, Effect, Fiber, Layer, Option, Queue, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { BackendCapacityReleases } from "#backend-capacity-releases/service.ts";
import { makeRetryBackendCapacity } from "#backend-capacity-retry.ts";
import { DispatcherLive } from "#dispatcher.ts";
import { makeSightSessionEvents } from "#sight-session-events.ts";
import { dispatchingLayer, domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, rawOf, sessionFor } from "#test/harness.ts";
import { reportsNativeRef, untilTerminal, WAKE_INSTRUCTION } from "#test/session-recovery-fixture.ts";
import { assignedPieces, chain, PATIENCE } from "#test/voyage-fixtures.ts";

const pieceIdOf = (payload: unknown): string | undefined =>
	typeof payload === "object" && payload !== null && "pieceId" in payload && typeof payload.pieceId === "string" ? payload.pieceId : undefined;

type KernelService = Parameters<typeof Kernel.of>[0];

const pauseNextSpawnSubmission = (
	kernel: KernelService,
	spawnTag: string,
	submitted: Deferred.Deferred<string | undefined>,
	releaseSubmit: Deferred.Deferred<void>,
): KernelService =>
	Kernel.of({
		...kernel,
		submit: (kind, payload) => {
			if (kind.tag !== spawnTag) {
				return kernel.submit(kind, payload);
			}
			return Deferred.succeed(submitted, pieceIdOf(payload)).pipe(
				Effect.andThen(Deferred.await(releaseSubmit)),
				Effect.andThen(kernel.submit(kind, payload)),
			);
		},
	});

const expectScriptedProviderBlocked = Effect.gen(function* () {
	const db = yield* Database;
	const reading = yield* db.BackendCapacity.where({
		backend: "scripted",
	}).first();
	expect(Option.getOrThrow(reading).status).toBe("blocked");
});

it.live("a retried birth recovered after restart is not dispatched twice", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const capacity = yield* makeBackendCapacityController((raw) =>
			raw.kind === "quota/rejected"
				? Option.some({
						detail: "scripted quota exhausted",
						reason: "usage-limit" as const,
						status: "blocked" as const,
					})
				: Option.none(),
		);
		capacity.observe(rawOf("quota/rejected"), yield* Clock.currentTimeMillis);
		const backend = { ...scripted.backend, capacity: capacity.source };
		const recovered = yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const { alpha, voyage } = yield* chain;
			const probe = yield* pieces.charter({
				charter: "prove the recovered dispatch is still pending",
				dependsOn: [],
				expectation: "the dispatcher reaches the next ready Piece",
				role: "probe",
				title: "Observe a dispatcher pass",
				voyageId: voyage.id,
			});
			yield* pieces.launch(probe.id);
			yield* db.Piece.where({ id: alpha.id }).update({
				launchedAt: new Date(1),
			});
			yield* db.Piece.where({ id: probe.id }).update({
				launchedAt: new Date(2),
			});
			const birth = yield* kernel.submit(domain.spawn, {
				agentId: "agent-recovered",
				backend: "scripted",
				charter: "resume the recovered birth",
				pieceId: alpha.id,
				role: alpha.role,
				runner: "local",
				sessionId: "session-recovered",
				voyageId: voyage.id,
			});
			const status = yield* birth.changes.pipe(
				Stream.takeUntil((current) => current === "waiting" || isTerminalIntentStatus(current)),
				Stream.runLast,
				Effect.map(Option.getOrThrow),
			);
			expect(status).toBe("waiting");
			return { intentId: birth.id, probeId: probe.id };
		}).pipe(Effect.provide(dispatchingLayer(temporary, backend, PATIENCE)));

		const submitted = yield* Deferred.make<string | undefined>();
		const releaseSubmit = yield* Deferred.make<void>();
		const observedDispatcher = Layer.unwrap(
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const kernel = yield* Kernel;
				const observedKernel = pauseNextSpawnSubmission(kernel, domain.spawn.tag, submitted, releaseSubmit);
				return DispatcherLive(PATIENCE).pipe(Layer.provide(Layer.succeed(Kernel, observedKernel)));
			}),
		).pipe(
			Layer.provideMerge(
				domainKernelLayer(temporary, backend, {
					gates: [maxConcurrency(0)],
				}),
			),
		);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const retry = yield* makeRetryBackendCapacity;
			yield* retry("scripted");
			expect(yield* Deferred.await(submitted)).toBe(recovered.probeId);
			const births = yield* db.Intent.where({ tag: "agent/spawn" }).all();
			expect(births).toHaveLength(1);
			expect(births[0]).toMatchObject({
				id: recovered.intentId,
				status: "queued",
			});
			yield* Deferred.succeed(releaseSubmit, undefined);
		}).pipe(Effect.provide(BackendCapacityReleases.layer.pipe(Layer.provideMerge(observedDispatcher))));
	}),
);

it.effect("a provider hold stops automatic wakes until the admiral retries it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const capacity = yield* makeBackendCapacityController((raw) =>
			raw.kind === "quota/rejected"
				? Option.some({
						detail: "scripted quota exhausted",
						reason: "usage-limit" as const,
						status: "blocked" as const,
					})
				: Option.none(),
		);
		const blockedReads = yield* Queue.unbounded<void>();
		const capacitySource = {
			...capacity.source,
			current: capacity.source.current.pipe(
				Effect.tap((observation) =>
					Option.isSome(observation) && observation.value.status === "blocked" ? Queue.offer(blockedReads, undefined) : Effect.void,
				),
			),
		};
		const backend = reportsNativeRef({ ...scripted.backend, capacity: capacitySource }, scripted, "native-held");
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const backendCapacities = yield* BackendCapacities;
			const sight = yield* makeSightSessionEvents;
			const { alpha } = yield* chain;
			const input = yield* scripted.queued;
			const kernel = yield* Kernel;
			const births = yield* db.Intent.where({ tag: "agent/spawn" }).all();
			expect(births).toHaveLength(1);
			expect(yield* untilTerminal(kernel.changes(Option.getOrThrow(Option.fromUndefinedOr(births[0])).id))).toBe("succeeded");
			expect(yield* assignedPieces).toEqual([alpha.id]);
			const assignment = Option.getOrThrow(yield* db.PieceAgent.where({ pieceId: alpha.id }).first());
			const session = Option.getOrThrow(yield* db.AgentSession.where({ id: input.sessionId }).first());
			expect(session.agentId).toBe(assignment.agentId);
			const live = yield* sessionFor(scripted, assignment.agentId);
			const opened = yield* sight.sessionEventFeed({ fromSeq: 0, sessionId: session.id }).pipe(Stream.take(1), Stream.runCollect, Effect.forkChild);
			yield* live.emit({
				nativeRef: "native-held",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			yield* Fiber.join(opened);
			expect(Option.getOrThrow(yield* db.AgentSession.where({ id: session.id }).first()).nativeRef).toBe("native-held");

			yield* Effect.scoped(
				Effect.gen(function* () {
					const feeds = yield* DomainFeeds;
					const refreshes = yield* feeds.subscribeFleetRefresh();
					capacity.observe(rawOf("quota/rejected"), yield* Clock.currentTimeMillis);
					yield* Stream.fromSubscription(refreshes).pipe(
						Stream.mapEffect(() => db.BackendCapacity.where({ backend: "scripted" }).first()),
						Stream.filter((reading) => Option.isSome(reading) && reading.value.status === "blocked"),
						Stream.take(1),
						Stream.runDrain,
					);
				}),
			);
			yield* expectScriptedProviderBlocked;
			yield* endsTurn(scripted, session.id);
			yield* Queue.take(blockedReads);
			expect(yield* live.steered).not.toContain(WAKE_INSTRUCTION);

			yield* backendCapacities.clear("scripted");
			yield* backendCapacities.announce();
			const resumed = yield* scripted.steered;
			expect(resumed.sessionId).toBe(session.id);
			const wakes = yield* db.Intent.where({ tag: "agent/wake" }).all();
			expect(wakes).toHaveLength(1);
			expect(yield* untilTerminal(kernel.changes(Option.getOrThrow(Option.fromUndefinedOr(wakes[0])).id))).toBe("succeeded");
			expect((yield* live.steered).filter((text) => text === WAKE_INSTRUCTION)).toHaveLength(1);
		}).pipe(
			Effect.provide(
				dispatchingLayer(temporary, backend, {
					maxRunning: 1,
					patienceMillis: 60_000,
				}),
			),
		);
	}),
);
