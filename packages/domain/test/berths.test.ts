import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Clock, Effect, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
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

const EIGHT_DAYS_MILLIS = 8 * 24 * 60 * 60 * 1000;

const payload: SpawnFields = {
	agentId: "agent-sweep",
	backend: "scripted",
	charter: "hold the berth",
	repos: [{ ref: "main", source: "/somewhere/reef" }],
	role: "keeper",
	runner: "local",
	sessionId: "session-sweep",
};

const submitSpawn = Effect.gen(function* () {
	const kernel = yield* Kernel;
	const domain = yield* AgentDomain;
	const submission = yield* kernel.submit(domain.spawn, payload);
	return yield* submission.changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);
});

const berthRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(
		yield* db.Berth.where({ id: "agent-sweep:berth-0" }).first(),
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

it.live("a berth is stranded while dirty and scrapped after the TTL", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const scraps = yield* Ref.make(0);

		const outcome = yield* submitSpawn.pipe(
			Effect.provide(
				domainKernelLayer(temporary, scripted.backend, {}, recorder.runner),
			),
		);
		expect(outcome).toBe("succeeded");
		const ready = yield* berthRow.pipe(Effect.provide(temporary.layer));
		expect(ready.status).toBe("ready");

		// why: a rebuild is a boot — the sweep judges every ready berth, and a
		// dirty verdict must strand it rather than delete it.
		yield* Effect.provide(
			Effect.void,
			domainKernelLayer(
				temporary,
				scripted.backend,
				{},
				dirtyRunner(recorder.runner),
			),
		);
		const stranded = yield* berthRow.pipe(Effect.provide(temporary.layer));
		expect(stranded.status).toBe("stranded");
		expect(stranded.strandedAt).not.toBeNull();

		const now = yield* Clock.currentTimeMillis;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.Berth.where({ id: "agent-sweep:berth-0" }).update({
					strandedAt: new Date(now - EIGHT_DAYS_MILLIS),
				}),
			);
		}).pipe(Effect.provide(temporary.layer));

		yield* Effect.provide(
			Effect.void,
			domainKernelLayer(
				temporary,
				scripted.backend,
				{},
				scrapCounting(dirtyRunner(recorder.runner), scraps),
			),
		);
		const scrapped = yield* berthRow.pipe(Effect.provide(temporary.layer));
		expect(scrapped.status).toBe("reclaimed");
		expect(yield* Ref.get(scraps)).toBe(1);
	}),
);
