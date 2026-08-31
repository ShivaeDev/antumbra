import { isTerminalIntentStatus, Kernel, maxConcurrency } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { makeBackendCapacityController } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Clock, Deferred, Effect, Layer, Option, Queue, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { BackendCapacityReleaseLive } from "#backend-capacity-release.ts";
import { makeRetryBackendCapacity } from "#backend-capacity-retry.ts";
import { DispatcherLive } from "#dispatcher.ts";
import { dispatchingLayer, domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, callTool, makeScriptedBackend, rawOf, sessionFor } from "#test/harness.ts";
import { reportsNativeRef, WAKE_INSTRUCTION } from "#test/session-recovery-fixture.ts";
import { assignedPieces, chain, eventually, PATIENCE } from "#test/voyage-fixtures.ts";

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

const expectNativeSession = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		expect((yield* db.AgentSession.where({ agentId }).all())[0]?.nativeRef).toBe("native-held");
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
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const { alpha, voyage } = yield* chain;
			const probe = yield* domain.voyages.charterPiece({
				charter: "prove the recovered dispatch is still pending",
				dependsOn: [],
				expectation: "the dispatcher reaches the next ready Piece",
				role: "probe",
				title: "Observe a dispatcher pass",
				voyageId: voyage.id,
			});
			yield* domain.voyages.launch(probe.id);
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
		}).pipe(Effect.provide(BackendCapacityReleaseLive.pipe(Layer.provideMerge(observedDispatcher))));
	}),
);

it.live("a provider hold stops automatic wakes until the admiral retries it", () =>
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
			const domain = yield* AgentDomain;
			const { alpha } = yield* chain;
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* assignedPieces).toEqual([alpha.id]);
				}),
			);
			const assignment = (yield* db.PieceAgent.where({
				pieceId: alpha.id,
			}).all())[0];
			if (assignment === undefined) {
				return yield* Effect.die("the dispatched Piece has no Agent");
			}
			const live = yield* sessionFor(scripted, assignment.agentId);
			yield* live.emit({
				nativeRef: "native-held",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			yield* eventually(expectNativeSession(assignment.agentId));

			capacity.observe(rawOf("quota/rejected"), yield* Clock.currentTimeMillis);
			yield* eventually(expectScriptedProviderBlocked);
			yield* callTool(live, "stand_down", undefined);
			yield* Queue.take(blockedReads);
			expect(yield* live.sent).not.toContain(WAKE_INSTRUCTION);

			yield* domain.backendCapacities.clear("scripted");
			yield* domain.backendCapacities.announce;
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* live.sent).toContain(WAKE_INSTRUCTION);
				}),
			);
			expect((yield* live.sent).filter((text) => text === WAKE_INSTRUCTION)).toHaveLength(1);
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
