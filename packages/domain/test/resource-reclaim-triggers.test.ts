import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import { type Runner, RunnerFailure } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref, Schedule, Stream } from "effect";
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

const payload = (suffix: string): SpawnFields => ({
	agentId: `agent-${suffix}`,
	backend: "scripted",
	charter: `test ${suffix} cleanup`,
	role: "keeper",
	runner: "local",
	sessionId: `session-${suffix}`,
});

const reclaimedRunner = (base: Runner, calls: Ref.Ref<number>): Runner => ({
	...base,
	reclaim: () =>
		Ref.update(calls, (count) => count + 1).pipe(
			Effect.as({ _tag: "reclaimed" as const }),
		),
});

const reclaimedBerth = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const berth = Option.getOrThrow(yield* db.Berth.where({ agentId }).first());
		expect(berth.status).toBe("reclaimed");
		expect(berth.reclaimState).toBeNull();
	});

it.live("retirement rings the reconciler without waiting for cadence", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const calls = yield* Ref.make(0);
		const runner = reclaimedRunner(recorded.runner, calls);
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/retire-trigger",
			});
			const spawn = yield* kernel.submit(
				domain.spawn,
				payload("retire-trigger"),
			);
			expect(yield* untilTerminal(spawn.changes)).toBe("succeeded");
			const retire = yield* kernel.submit(domain.retire, {
				agentId: "agent-retire-trigger",
			});
			expect(yield* untilTerminal(retire.changes)).toBe("succeeded");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* Ref.get(calls)).toBe(1);
					yield* reclaimedBerth("agent-retire-trigger");
				}),
			);
		}).pipe(
			Effect.provide(domainKernelLayer(temporary, backend.backend, {}, runner)),
		);
	}),
);

it.live("failed setup rings the same reconciler", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const calls = yield* Ref.make(0);
		const runner: Runner = {
			...reclaimedRunner(recorded.runner, calls),
			provision: () =>
				new RunnerFailure({ detail: "setup abandoned", tag: "local" }),
		};
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/failed-trigger",
			});
			const spawn = yield* kernel.submit(
				domain.spawn,
				payload("failed-trigger"),
			);
			expect(yield* untilTerminal(spawn.changes)).toBe("failed");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* Ref.get(calls)).toBe(1);
					yield* reclaimedBerth("agent-failed-trigger");
				}),
			);
		}).pipe(
			Effect.provide(domainKernelLayer(temporary, backend.backend, {}, runner)),
		);
	}),
);

it.live("bounded cadence self-heals a lost lifecycle ring", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const calls = yield* Ref.make(0);
		const runner = reclaimedRunner(recorded.runner, calls);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				Effect.all([
					db.Agent.create({
						charter: "cadence must find this",
						id: "agent-cadence",
						role: "keeper",
						status: "retired",
					}),
					db.Moorage.create({
						agentId: "agent-cadence",
						reclaimState: null,
						root: "/tmp/moorage/agent-cadence",
						runner: "local",
						status: "ready",
					}),
					db.Berth.create({
						agentId: "agent-cadence",
						branch: "work/agent-cadence/berth-0",
						id: "agent-cadence:berth-0",
						path: "/tmp/moorage/agent-cadence/berth-0",
						reclaimState: null,
						ref: "main",
						runner: "local",
						slug: "berth-0",
						source: "/somewhere/cadence",
						status: "ready",
						strandedAt: null,
					}),
				]),
			);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* Ref.get(calls)).toBe(1);
					yield* reclaimedBerth("agent-cadence");
				}),
			);
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, backend.backend, {}, runner, new Map(), {
					cadenceMillis: 25,
				}),
			),
		);
	}),
);
