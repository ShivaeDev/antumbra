import { type IntentStatus, Kernel } from "@antumbra/kernel";
import type { BerthPlan } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { fleetSnapshot } from "#sight-fleet.ts";
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

const spawnPayload = (suffix: string): SpawnFields => ({
	agentId: `agent-${suffix}`,
	backend: "scripted",
	charter: `charter for ${suffix}`,
	role: "hand",
	runner: "local",
	sessionId: `session-${suffix}`,
});

const submitSpawn = (suffix: string) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const submission = yield* kernel.submit(domain.spawn, spawnPayload(suffix));
		return yield* submission.changes.pipe(
			Stream.takeUntil((status) => TERMINAL.has(status)),
			Stream.runLast,
			Effect.map(Option.getOrThrow),
		);
	});

// why: two repos registered in the same millisecond tie on createdAt, so the
// berth order is not the assertion — the set of berths is.
const bySource = (berths: ReadonlyArray<BerthPlan>) =>
	berths
		.map((berth) => ({ ref: berth.ref, source: berth.source }))
		.sort((left, right) => left.source.localeCompare(right.source));

it.live("a spawn is moored to every registered repo at its default ref", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/reefs/one",
			});
			yield* domain.repos.register({
				defaultRef: "trunk",
				source: "/reefs/two",
			});
			expect(yield* submitSpawn("a")).toBe("succeeded");
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, recorder.runner),
			),
		);
		const requests = yield* recorder.provisioned;
		expect(requests).toHaveLength(1);
		expect(bySource(requests[0]?.berths ?? [])).toEqual([
			{ ref: "main", source: "/reefs/one" },
			{ ref: "trunk", source: "/reefs/two" },
		]);
	}),
);

it.live("registering a source twice refreshes it rather than doubling it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const first = yield* domain.repos.register({
				defaultRef: "main",
				source: "/reefs/one",
			});
			const again = yield* domain.repos.register({
				defaultRef: "trunk",
				source: "/reefs/one",
			});
			expect(again.id).toBe(first.id);
			expect(yield* domain.repos.list).toEqual([
				{
					defaultRef: "trunk",
					id: first.id,
					name: "one",
					source: "/reefs/one",
				},
			]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a forgotten repo leaves the next spawn a bare moorage", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const repo = yield* domain.repos.register({
				defaultRef: "main",
				source: "/reefs/one",
			});
			yield* domain.repos.forget(repo.id);
			expect(yield* submitSpawn("b")).toBe("succeeded");
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, recorder.runner),
			),
		);
		const requests = yield* recorder.provisioned;
		expect(requests[0]?.berths).toEqual([]);
	}),
);

it.live("the fleet snapshot carries the registry", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const repo = yield* domain.repos.register({
				defaultRef: "main",
				source: "/reefs/one.git",
			});
			const fleet = yield* fleetSnapshot(["scripted"], []);
			expect(fleet.repos).toEqual([
				{
					defaultRef: "main",
					id: repo.id,
					name: "one",
					source: "/reefs/one.git",
				},
			]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
