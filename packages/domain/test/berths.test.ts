import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Clock, Effect, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { REEF_SOURCE } from "#test/change-fixtures.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";

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
	yield* domain.repos.register({
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

const detachSweepAgent = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.where({ id: sweepPayload.agentId })
		.update({ status: "dormant" })
		.pipe(
			Effect.andThen(
				db.AgentSession.where({ id: sweepPayload.sessionId }).update({
					status: "closed",
				}),
			),
		);
});

const dirtyRunner = (base: Runner): Runner => ({
	...base,
	reclaim: () => Effect.succeed({ _tag: "dirty" as const }),
});

const scrapCounting = (base: Runner, scraps: Ref.Ref<number>): Runner => ({
	...base,
	scrap: () => Ref.update(scraps, (count) => count + 1),
});

it.live("an old dirty berth stays stranded without destructive cleanup", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const scraps = yield* Ref.make(0);

		const outcome = yield* submitSpawn.pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend, {}, recorder.runner)));
		expect(outcome).toBe("succeeded");
		const ready = yield* berthRow.pipe(Effect.provide(temporary.layer));
		expect(ready.status).toBe("ready");
		yield* detachSweepAgent.pipe(Effect.provide(temporary.layer));

		// why: the explicitly detached Agent makes this berth reclaimable; an
		// alive Agent would instead resume and keep its ready resources.
		yield* Effect.provide(Effect.void, domainKernelLayer(temporary, scripted.backend, {}, dirtyRunner(recorder.runner)));
		const stranded = yield* berthRow.pipe(Effect.provide(temporary.layer));
		expect(stranded.status).toBe("stranded");
		expect(stranded.strandedAt).not.toBeNull();

		const now = yield* Clock.currentTimeMillis;
		const oldStrandedAt = new Date(now - EIGHT_DAYS_MILLIS);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.Berth.where({ id: "agent-sweep:berth-0" }).update({
				strandedAt: oldStrandedAt,
			});
		}).pipe(Effect.provide(temporary.layer));

		yield* Effect.provide(Effect.void, domainKernelLayer(temporary, scripted.backend, {}, scrapCounting(dirtyRunner(recorder.runner), scraps)));
		const preserved = yield* berthRow.pipe(Effect.provide(temporary.layer));
		expect(preserved.status).toBe("stranded");
		expect(preserved.strandedAt?.getTime()).toBe(oldStrandedAt.getTime());
		expect(yield* Ref.get(scraps)).toBe(0);
	}),
);
