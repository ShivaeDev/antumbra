import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Clock, Effect, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { REEF_SOURCE } from "#test/change-fixtures.ts";
import { makeScriptedRunner } from "#test/harness.ts";

const EIGHT_DAYS_MILLIS = 8 * 24 * 60 * 60 * 1000;

const sweepPayload: SpawnFields = {
	agentId: "agent-sweep",
	backend: "scripted",
	charter: "hold the berth",
	role: "keeper",
	runner: "local",
	sessionId: "session-sweep",
};

const submitSpawn = Effect.gen(function* () {
	const kernel = yield* Kernel;
	const domain = yield* AgentDomain;
	const repos = yield* Repos;
	yield* repos.register({
		defaultRef: "main",
		source: REEF_SOURCE,
	});
	const submission = yield* kernel.submit(domain.spawn, sweepPayload);
	return yield* submission.changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));
});

const berthRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(yield* db.Berth.where({ id: "agent-sweep:berth-0" }).first());
});

it.effectApp.withProviders(
	"an old dirty berth stays stranded without destructive cleanup",
	Effect.gen(function* () {
		const recorder = yield* makeScriptedRunner;
		const scraps = yield* Ref.make(0);
		const runner: Runner = {
			...recorder.runner,
			reclaim: () => Effect.succeed({ _tag: "dirty" as const }),
			scrap: () => Ref.update(scraps, (count) => count + 1),
		};
		return { providers: { runners: new Map([[runner.tag, runner]]) }, state: scraps };
	}),
	function* ({ scripted, db }, scraps) {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const reconciler = yield* ResourceReconciler;
		expect(yield* submitSpawn).toBe("succeeded");
		const ready = yield* berthRow;
		expect(ready.status).toBe("ready");
		yield* endsTurn(scripted, sweepPayload.sessionId);
		const retirement = yield* kernel.submit(domain.retire, { agentId: sweepPayload.agentId });
		expect(yield* retirement.changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow))).toBe("succeeded");
		yield* reconciler.reconcile();
		const stranded = yield* berthRow;
		expect(stranded.status).toBe("stranded");
		expect(stranded.strandedAt).not.toBeNull();

		const now = yield* Clock.currentTimeMillis;
		const oldStrandedAt = new Date(now - EIGHT_DAYS_MILLIS);
		yield* db.Berth.where({ id: "agent-sweep:berth-0" }).update({ strandedAt: oldStrandedAt });
		yield* reconciler.reconcile();
		const preserved = yield* berthRow;
		expect(preserved.status).toBe("stranded");
		expect(preserved.strandedAt?.getTime()).toBe(oldStrandedAt.getTime());
		expect(yield* Ref.get(scraps)).toBe(0);
	},
);
