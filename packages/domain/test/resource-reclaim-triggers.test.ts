import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { type BerthSite, type Runner, RunnerFailure } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner, standDown } from "#test/harness.ts";

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));

const payload = (suffix: string): SpawnFields => ({
	agentId: `agent-${suffix}`,
	backend: "scripted",
	charter: `test ${suffix} cleanup`,
	role: "keeper",
	runner: "local",
	sessionId: `session-${suffix}`,
});

const reclaimedRunner = (base: Runner, calls: Ref.Ref<ReadonlyArray<BerthSite>>, reclaimed: Deferred.Deferred<BerthSite>): Runner => ({
	...base,
	reclaim: (berth) =>
		Ref.update(calls, (all) => [...all, berth]).pipe(Effect.andThen(Deferred.succeed(reclaimed, berth)), Effect.as({ _tag: "reclaimed" as const })),
});

const reclaimedOnce = (calls: Ref.Ref<ReadonlyArray<BerthSite>>, reclaimed: Deferred.Deferred<BerthSite>) =>
	Effect.gen(function* () {
		yield* Deferred.await(reclaimed);
		expect(yield* Ref.get(calls)).toHaveLength(1);
	});

it.live("retirement rings the reconciler without waiting for cadence", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const calls = yield* Ref.make<ReadonlyArray<BerthSite>>([]);
		const reclaimed = yield* Deferred.make<BerthSite>();
		const runner = reclaimedRunner(recorded.runner, calls, reclaimed);
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const repos = yield* Repos;
			const kernel = yield* Kernel;
			yield* repos.register({
				defaultRef: "main",
				source: "/somewhere/retire-trigger",
			});
			const spawn = yield* kernel.submit(domain.spawn, payload("retire-trigger"));
			expect(yield* untilTerminal(spawn.changes)).toBe("succeeded");
			yield* standDown(backend, "agent-retire-trigger");
			const retire = yield* kernel.submit(domain.retire, {
				agentId: "agent-retire-trigger",
			});
			expect(yield* untilTerminal(retire.changes)).toBe("succeeded");
			yield* reclaimedOnce(calls, reclaimed);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend.backend, {}, runner)));
	}),
);

it.live("failed setup rings the same reconciler", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const calls = yield* Ref.make<ReadonlyArray<BerthSite>>([]);
		const reclaimed = yield* Deferred.make<BerthSite>();
		const runner: Runner = {
			...reclaimedRunner(recorded.runner, calls, reclaimed),
			provision: () => new RunnerFailure({ detail: "setup abandoned", tag: "local" }),
		};
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const repos = yield* Repos;
			const kernel = yield* Kernel;
			yield* repos.register({
				defaultRef: "main",
				source: "/somewhere/failed-trigger",
			});
			const spawn = yield* kernel.submit(domain.spawn, payload("failed-trigger"));
			expect(yield* untilTerminal(spawn.changes)).toBe("failed");
			yield* reclaimedOnce(calls, reclaimed);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend.backend, {}, runner)));
	}),
);
