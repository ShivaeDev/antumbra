import { IntentExecution, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { BackendCapacities, type BackendCapacityReading } from "@antumbra/provider-capacity";
import { capacityHoldDetail } from "@antumbra/sessions/admission/hold";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { BackendCapacityReleases } from "#backend-capacity-releases/service.ts";
import {
	dependencies,
	type KernelService,
	makeCapacities,
	SCRIPTED,
	spawnKind,
	spawnPayload,
	waitForChange,
	wakeKind,
	withReleaseDomain,
	withReleases,
} from "#test/backend-capacity-release-harness.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";

type CapacityFixture = Effect.Success<typeof makeCapacities>;
type SpawnKind = ReturnType<typeof spawnKind>;

const makeStaleDetailRace = Effect.gen(function* () {
	const kernel = yield* Kernel;
	const db = yield* Database;
	const attempted = yield* Ref.make<ReadonlyArray<string>>([]);
	const retryIfWaiting: KernelService["retryIfWaiting"] = (id, expectedDetail) =>
		Ref.update(attempted, (details) => [...details, expectedDetail]).pipe(
			Effect.andThen(
				db.Intent.where({ id }).update({
					detail: "provider credentials changed",
				}),
			),
			Effect.andThen(kernel.retryIfWaiting(id, expectedDetail)),
		);
	return {
		attempted,
		kernel: Kernel.of({ ...kernel, retryIfWaiting }),
	};
});

const assertStaleDetailSafety = (spawn: SpawnKind) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const db = yield* Database;
		const domain = yield* AgentDomain;
		const capacities = yield* BackendCapacities;
		const held = yield* kernel.submit(spawn, spawnPayload("held"));
		const unrelated = yield* kernel.submit(spawn, spawnPayload("unrelated"));
		yield* Effect.all([waitForChange(kernel, held.id, "waiting"), waitForChange(kernel, unrelated.id, "waiting")], { concurrency: "unbounded" });
		yield* capacities.clear(SCRIPTED);
		const race = yield* makeStaleDetailRace;
		yield* Layer.build(
			BackendCapacityReleases.layer.pipe(Layer.provideMerge(Layer.mergeAll(Layer.succeed(Kernel, race.kernel), Layer.succeed(AgentDomain, domain)))),
		);

		expect(yield* Ref.get(race.attempted)).toEqual([capacityHoldDetail(SCRIPTED, "scripted quota exhausted")]);
		expect(Option.getOrThrow(yield* db.Intent.where({ id: held.id }).first())).toMatchObject({
			detail: "provider credentials changed",
			status: "waiting",
		});
		expect(Option.getOrThrow(yield* db.Intent.where({ id: unrelated.id }).first())).toMatchObject({
			detail: "runner authentication required",
			status: "waiting",
		});
	});

const staleDetailSafety = Effect.gen(function* () {
	const temporary = yield* acquireTemporaryPersistence;
	const { capacities } = yield* makeCapacities;
	const spawn = spawnKind(({ agentId }) =>
		IntentExecution.use((execution) =>
			execution.wait(agentId === "unrelated" ? "runner authentication required" : capacityHoldDetail(SCRIPTED, "scripted quota exhausted")),
		),
	);
	const wake = wakeKind(() => Effect.void);
	yield* withReleaseDomain(temporary, capacities, spawn, wake, (domain) =>
		assertStaleDetailSafety(spawn).pipe(Effect.scoped, Effect.provide(dependencies(temporary.layer, domain, spawn, wake))),
	);
});

const isBlockedFreshRejection = (attempts: number, readings: ReadonlyArray<BackendCapacityReading>) =>
	attempts === 2 && readings.some((reading) => reading.backend === SCRIPTED && reading.status === "blocked");

const markReconciledFreshRejection = (
	attempts: Ref.Ref<number>,
	reconciled: Deferred.Deferred<void>,
	readings: ReadonlyArray<BackendCapacityReading>,
) =>
	Effect.gen(function* () {
		if (isBlockedFreshRejection(yield* Ref.get(attempts), readings)) {
			yield* Deferred.succeed(reconciled, undefined);
		}
	});

const makeFreshRejectingSpawn = (attempts: Ref.Ref<number>, state: CapacityFixture["state"]) =>
	spawnKind(() =>
		Effect.gen(function* () {
			const attempt = yield* Ref.updateAndGet(attempts, (count) => count + 1);
			if (attempt === 2) {
				yield* Ref.set(state, {
					detail: "scripted quota still exhausted",
					status: "blocked",
				});
			}
			const capacity = yield* Ref.get(state);
			const execution = yield* IntentExecution;
			yield* execution.wait(capacityHoldDetail(SCRIPTED, capacity.detail));
		}),
	);

const waitForTwoWaitingTransitions = (kernel: KernelService, id: string, listening: Deferred.Deferred<void>) =>
	kernel.changes(id).pipe(
		Stream.tap((status) => (status === "waiting" ? Deferred.succeed(listening, undefined) : Effect.void)),
		Stream.filter((status) => status === "waiting"),
		Stream.take(2),
		Stream.runDrain,
	);

const assertFreshRejectionParks = (
	spawn: SpawnKind,
	attempts: Ref.Ref<number>,
	reconciled: Deferred.Deferred<void>,
	listening: Deferred.Deferred<void>,
) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const db = yield* Database;
		const releases = yield* BackendCapacityReleases;
		const submission = yield* kernel.submit(spawn, spawnPayload("fresh-block"));
		yield* waitForChange(kernel, submission.id, "waiting");
		const freshWaiting = yield* Effect.forkChild(waitForTwoWaitingTransitions(kernel, submission.id, listening));
		yield* Deferred.await(listening);
		yield* releases.release(SCRIPTED);
		yield* Fiber.join(freshWaiting);
		yield* Deferred.await(reconciled);
		const parked = Option.getOrThrow(yield* db.Intent.where({ id: submission.id }).first());
		expect(parked).toMatchObject({
			detail: capacityHoldDetail(SCRIPTED, "scripted quota still exhausted"),
			status: "waiting",
		});
		expect(yield* Ref.get(attempts)).toBe(2);
	});

const freshRejectionSafety = Effect.gen(function* () {
	const temporary = yield* acquireTemporaryPersistence;
	const attempts = yield* Ref.make(0);
	const reconciled = yield* Deferred.make<void>();
	const listening = yield* Deferred.make<void>();
	const { capacities: baseCapacities, state } = yield* makeCapacities;
	const capacities = {
		...baseCapacities,
		snapshot: () => baseCapacities.snapshot().pipe(Effect.tap((readings) => markReconciledFreshRejection(attempts, reconciled, readings))),
	};
	const spawn = makeFreshRejectingSpawn(attempts, state);
	const wake = wakeKind(() => Effect.void);
	yield* withReleaseDomain(temporary, capacities, spawn, wake, (domain) =>
		assertFreshRejectionParks(spawn, attempts, reconciled, listening).pipe(Effect.provide(withReleases(temporary.layer, domain, spawn, wake))),
	);
});

it.live("does not retry an unrelated wait or a hold whose detail went stale", () => staleDetailSafety);

it.live("a fresh rejection parks without a retry loop", () => freshRejectionSafety);
