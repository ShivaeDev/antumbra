import { IntentExecution, Kernel, KernelLive } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { type AgentBackend, type BackendCapacitySource, makeBackendCapacityController } from "@antumbra/plugin-api";
import { capacityHoldDetail } from "@antumbra/sessions/admission/hold";
import { expect, it } from "@effect/vitest";
import { Clock, Deferred, Effect, Layer, ManagedRuntime, Option, Ref } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { BackendCapacityReleaseLive, BackendCapacityReleases } from "#backend-capacity-release.ts";
import {
	makeCapacities,
	SCRIPTED,
	spawnKind,
	spawnPayload,
	templateDomainLayer,
	waitForChange,
	wakeKind,
	wakePayload,
	withReleaseDomain,
	withReleases,
} from "#test/backend-capacity-release-harness.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, rawOf } from "#test/harness.ts";

type AgentDomainService = Parameters<typeof AgentDomain.of>[0];
type Attempts = Ref.Ref<Map<string, number>>;

const controllerEffect = makeBackendCapacityController((raw) =>
	raw.kind === "quota/rejected"
		? Option.some({
				detail: "scripted quota exhausted",
				reason: "usage-limit" as const,
				status: "blocked" as const,
			})
		: Option.none(),
);

const recordAttempt = (attempts: Attempts, name: string) =>
	Ref.modify(attempts, (before) => {
		const next = new Map(before);
		const count = (next.get(name) ?? 0) + 1;
		next.set(name, count);
		return [count, next] as const;
	});

const parkFirstAttempt = (attempts: Attempts, template: AgentDomainService, name: string) =>
	Effect.gen(function* () {
		const attempt = yield* recordAttempt(attempts, name);
		if (attempt !== 1) {
			return;
		}
		const reading = (yield* template.backendCapacities.snapshot())[0];
		if (reading === undefined) {
			return yield* Effect.die("scripted capacity is missing");
		}
		const execution = yield* IntentExecution;
		yield* execution.wait(capacityHoldDetail(SCRIPTED, reading.detail));
	});

const restartDomain = (template: AgentDomainService, attempts: Attempts): AgentDomainService => {
	const execute = (name: string) => parkFirstAttempt(attempts, template, name);
	const spawn = spawnKind((payload) => execute(payload.agentId));
	const wake = wakeKind((payload) => execute(payload.sessionId));
	return AgentDomain.of({
		...template,
		kinds: [spawn, wake],
		spawn,
		wake,
	});
};

const domainKernelLayer = (temporary: TemporaryPersistence, backendTemplate: AgentBackend, capacity: BackendCapacitySource, attempts: Attempts) => {
	const backend = { ...backendTemplate, capacity };
	const domain = Layer.effect(AgentDomain)(Effect.map(AgentDomain, (template) => restartDomain(template, attempts))).pipe(
		Layer.provide(templateDomainLayer(temporary, backend)),
	);
	return Layer.unwrap(Effect.map(AgentDomain, (current) => KernelLive({ kinds: current.kinds }))).pipe(
		Layer.provideMerge(domain),
		Layer.provideMerge(temporary.layer),
	);
};

const releaseRuntimeLayer = (temporary: TemporaryPersistence, backend: AgentBackend, capacity: BackendCapacitySource, attempts: Attempts) =>
	BackendCapacityReleaseLive.pipe(Layer.provideMerge(domainKernelLayer(temporary, backend, capacity, attempts)));

const parkWorkAndDurablyClear = Effect.gen(function* () {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const birth = yield* kernel.submit(domain.spawn, spawnPayload("birth"));
	const resume = yield* kernel.submit(domain.wake, wakePayload("wake"));
	yield* Effect.all([waitForChange(kernel, birth.id, "waiting"), waitForChange(kernel, resume.id, "waiting")], { concurrency: "unbounded" });
	// The first runtime has no release reconciler, so the durable clear remains unconsumed until restart.
	yield* domain.backendCapacities.clear(SCRIPTED);
	expect(Option.getOrThrow(yield* db.BackendCapacity.where({ backend: SCRIPTED }).first())).toMatchObject({ status: "available" });
	return [birth.id, resume.id] as const;
});

const verifyRestartedRelease = (ids: ReadonlyArray<string>, attempts: Attempts) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		expect((yield* domain.backendCapacities.snapshot())[0]).toMatchObject({
			status: "available",
		});
		yield* Effect.all(
			ids.map((id) => waitForChange(kernel, id, "succeeded")),
			{ concurrency: "unbounded" },
		);
		expect([...(yield* Ref.get(attempts)).values()]).toEqual([2, 2]);
	});

const runCrashRuntime = (layer: ReturnType<typeof domainKernelLayer>) =>
	Effect.acquireUseRelease(
		Effect.sync(() => ManagedRuntime.make(layer)),
		(runtime) => Effect.promise(() => runtime.runPromise(parkWorkAndDurablyClear)),
		(runtime) => Effect.promise(() => runtime.dispose()),
	);

const runRecoveryRuntime = (layer: ReturnType<typeof releaseRuntimeLayer>, ids: ReadonlyArray<string>, attempts: Attempts) =>
	Effect.acquireUseRelease(
		Effect.sync(() => ManagedRuntime.make(layer)),
		(runtime) => Effect.promise(() => runtime.runPromise(verifyRestartedRelease(ids, attempts))),
		(runtime) => Effect.promise(() => runtime.dispose()),
	);

it.live("repairs both parked births and wakes on boot after a durable clear", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const controller = yield* controllerEffect;
		controller.observe(rawOf("quota/rejected"), yield* Clock.currentTimeMillis);
		const attempts = yield* Ref.make(new Map<string, number>());
		const ids = yield* runCrashRuntime(domainKernelLayer(temporary, scripted.backend, controller.source, attempts));
		expect(Option.isNone(yield* controller.source.current)).toBe(true);

		const restartedController = yield* controllerEffect;
		expect(Option.isNone(yield* restartedController.source.current)).toBe(true);
		yield* runRecoveryRuntime(releaseRuntimeLayer(temporary, scripted.backend, restartedController.source, attempts), ids, attempts);
	}),
);

it.live("releases work that reaches waiting after the clear", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const { capacities, state } = yield* makeCapacities;
		const running = yield* Deferred.make<void>();
		const park = yield* Deferred.make<void>();
		const attempts = yield* Ref.make(0);
		const spawn = spawnKind(() =>
			Effect.gen(function* () {
				const attempt = yield* Ref.updateAndGet(attempts, (count) => count + 1);
				if (attempt !== 1) {
					return;
				}
				const beforeClear = yield* Ref.get(state);
				yield* Deferred.succeed(running, undefined);
				yield* Deferred.await(park);
				const execution = yield* IntentExecution;
				yield* execution.wait(capacityHoldDetail(SCRIPTED, beforeClear.detail));
			}),
		);
		const wake = wakeKind(() => Effect.void);
		yield* withReleaseDomain(temporary, capacities, spawn, wake, (domain) =>
			Effect.gen(function* () {
				const kernel = yield* Kernel;
				const releases = yield* BackendCapacityReleases;
				const submission = yield* kernel.submit(spawn, spawnPayload("late-birth"));
				yield* Deferred.await(running);
				yield* releases.release(SCRIPTED);
				yield* Deferred.succeed(park, undefined);
				yield* waitForChange(kernel, submission.id, "succeeded");
				expect(yield* Ref.get(attempts)).toBe(2);
			}).pipe(Effect.provide(withReleases(temporary.layer, domain, spawn, wake))),
		);
	}),
);
