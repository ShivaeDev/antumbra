import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import type { BerthPlan } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { fleetSnapshot } from "#sight-fleet.ts";
import { makeScriptedRunner } from "#test/harness.ts";

const runnerSetup = makeScriptedRunner.pipe(
	Effect.map((recorder) => ({
		providers: { runners: new Map([[recorder.runner.tag, recorder.runner]]) },
		state: recorder,
	})),
);

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
		return yield* submission.changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));
	});

const bySource = (berths: ReadonlyArray<BerthPlan>) =>
	berths.map((berth) => ({ ref: berth.ref, source: berth.source })).sort((left, right) => left.source.localeCompare(right.source));

it.effectApp.withProviders("a spawn is moored to every registered repo at its default ref", runnerSetup, function* (_, recorder) {
	const repos = yield* Repos;
	yield* repos.register({
		defaultRef: "main",
		source: "/reefs/one",
	});
	yield* repos.register({
		defaultRef: "trunk",
		source: "/reefs/two",
	});
	expect(yield* submitSpawn("a")).toBe("succeeded");
	const requests = yield* recorder.provisioned;
	expect(requests).toHaveLength(1);
	expect(bySource(requests[0]?.berths ?? [])).toEqual([
		{ ref: "main", source: "/reefs/one" },
		{ ref: "trunk", source: "/reefs/two" },
	]);
});

it.effectApp.withProviders("a forgotten repo leaves the next spawn a bare moorage", runnerSetup, function* (_, recorder) {
	const repos = yield* Repos;
	const repo = yield* repos.register({
		defaultRef: "main",
		source: "/reefs/one",
	});
	yield* repos.forget(repo.id);
	expect(yield* submitSpawn("b")).toBe("succeeded");
	const requests = yield* recorder.provisioned;
	expect(requests[0]?.berths).toEqual([]);
});

it.effectApp("the fleet snapshot carries the registry", function* () {
	const repos = yield* Repos;
	const repo = yield* repos.register({
		defaultRef: "main",
		source: "/reefs/one.git",
	});
	const fleet = yield* fleetSnapshot(["scripted"], new Set(), [], [], {
		attached: new Set(),
		delegating: new Set(),
	});
	expect(fleet.repos).toMatchObject([
		{
			defaultRef: "main",
			id: repo.id,
			name: "one",
			source: "/reefs/one.git",
		},
	]);
});
