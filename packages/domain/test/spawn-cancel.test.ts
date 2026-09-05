import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import { SessionFabric } from "@antumbra/session-fabric";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { makeScriptedRunner } from "#test/harness.ts";

const payload: SpawnFields = {
	agentId: "agent-cancel",
	backend: "scripted",
	charter: "cancel this setup",
	pieceId: "piece-cancel",
	role: "test hand",
	runner: "local",
	sessionId: "session-cancel",
};

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));

it.effectApp.withProviders(
	"explicit cancel settles one spawning birth and its incomplete plan",
	Effect.gen(function* () {
		const recorded = yield* makeScriptedRunner;
		const provisioning = yield* Deferred.make<void>();
		const hold = yield* Deferred.make<void>();
		const runner: Runner = {
			...recorded.runner,
			provision: () => Deferred.succeed(provisioning, undefined).pipe(Effect.andThen(Deferred.await(hold))),
		};
		return { providers: { runners: new Map([[runner.tag, runner]]) }, state: provisioning };
	}),
	function* (_, provisioning) {
		const db = yield* Database;
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const repos = yield* Repos;
		yield* repos.register({
			defaultRef: "main",
			source: "/somewhere/cancel",
		});
		const submission = yield* kernel.submit(domain.spawn, payload);
		yield* Deferred.await(provisioning);
		yield* kernel.cancel(submission.id);
		expect(yield* untilTerminal(submission.changes)).toBe("cancelled");
		const agent = Option.getOrThrow(yield* db.Agent.where({ id: payload.agentId }).first());
		expect(agent.status).toBe("dormant");
		expect(Option.getOrThrow(yield* db.Moorage.where({ agentId: payload.agentId }).first()).status).toBe("provisioning");
		expect((yield* db.Berth.where({ agentId: payload.agentId }).all()).map((berth) => berth.status)).toEqual(["provisioning"]);
		expect((yield* db.Agent.all()).map((row) => row.id)).toEqual([payload.agentId]);
		expect((yield* db.Intent.all()).map((row) => row.id)).toEqual([submission.id]);
		expect(yield* db.PieceAgent.all()).toEqual([]);
		expect(yield* db.AgentSession.all()).toHaveLength(0);
	},
);

it.effectApp.withProviders(
	"explicit cancel settles a spawn waiting behind closed admission",
	Effect.gen(function* () {
		const recorded = yield* makeScriptedRunner;
		const provisioning = yield* Deferred.make<void>();
		const runner: Runner = {
			...recorded.runner,
			provision: (plan) => recorded.runner.provision(plan).pipe(Effect.tap(() => Deferred.succeed(provisioning, undefined))),
		};
		return { providers: { runners: new Map([[runner.tag, runner]]) }, state: provisioning };
	}),
	function* ({ scripted }, provisioning) {
		const db = yield* Database;
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const fabric = yield* SessionFabric;
		yield* fabric.closeStarts();
		const submission = yield* kernel.submit(domain.spawn, payload);
		yield* Deferred.await(provisioning);
		expect(Option.getOrThrow(yield* db.Agent.where({ id: payload.agentId }).first()).status).toBe("spawning");
		expect(yield* db.AgentSession.all()).toHaveLength(0);
		expect(yield* scripted.opened).toHaveLength(0);

		yield* kernel.cancel(submission.id);
		expect(yield* untilTerminal(submission.changes)).toBe("cancelled");
		expect(Option.getOrThrow(yield* db.Agent.where({ id: payload.agentId }).first()).status).toBe("dormant");
		expect(yield* db.AgentSession.all()).toHaveLength(0);
		expect(yield* scripted.opened).toHaveLength(0);
	},
);
