import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Clock, Effect, Option, Ref, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { changeOf, REEF_SOURCE } from "#test/change-fixtures.ts";
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

it.live("an old dirty berth stays stranded without destructive cleanup", () =>
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
		const oldStrandedAt = new Date(now - EIGHT_DAYS_MILLIS);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			yield* writer.write(
				db.Berth.where({ id: "agent-sweep:berth-0" }).update({
					strandedAt: oldStrandedAt,
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
		const preserved = yield* berthRow.pipe(Effect.provide(temporary.layer));
		expect(preserved.status).toBe("stranded");
		expect(preserved.strandedAt?.getTime()).toBe(oldStrandedAt.getTime());
		expect(yield* Ref.get(scraps)).toBe(0);
	}),
);

const SHOAL_SOURCE = "/somewhere/shoal";
const HELD_BRANCH = "work/keeper/berth-0";
const HELD = "agent-keeper:held";
const AT_WORK = "agent-keeper:at-work";
const SIBLING = "agent-keeper:sibling";
const ELSEWHERE = "agent-keeper:elsewhere";

const berthAt = (fields: {
	readonly branch: string;
	readonly id: string;
	readonly source: string;
	readonly strandedAt: Date | null;
}) => ({
	agentId: "agent-keeper",
	branch: fields.branch,
	id: fields.id,
	path: `/tmp/moorage/agent-keeper/${fields.id}`,
	ref: "main",
	runner: "local",
	slug: fields.id,
	source: fields.source,
	status: fields.strandedAt === null ? "ready" : "stranded",
	strandedAt: fields.strandedAt,
});

// why: the berths are written straight in rather than spawned for — this is
// about what the boot sweep does to berths that already exist, and one of them
// has to be older than the stranded TTL before the process ever starts.
const moored = (strandedAt: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			Effect.all([
				db.Repo.create({
					defaultRef: "main",
					id: "repo-reef",
					name: "reef",
					source: REEF_SOURCE,
				}),
				db.Repo.create({
					defaultRef: "main",
					id: "repo-shoal",
					name: "shoal",
					source: SHOAL_SOURCE,
				}),
				db.Change.create(
					changeOf({
						headRef: HELD_BRANCH,
						id: "change-open",
						repoId: "repo-reef",
						stage: "open",
					}),
				),
				db.PieceChange.create({
					changeId: "change-open",
					pieceId: "piece-open",
				}),
				db.Berth.create(
					berthAt({
						branch: HELD_BRANCH,
						id: HELD,
						source: REEF_SOURCE,
						strandedAt,
					}),
				),
				db.Berth.create(
					berthAt({
						branch: HELD_BRANCH,
						id: AT_WORK,
						source: REEF_SOURCE,
						strandedAt: null,
					}),
				),
				db.Berth.create(
					berthAt({
						branch: "work/keeper/berth-1",
						id: SIBLING,
						source: REEF_SOURCE,
						strandedAt,
					}),
				),
				db.Berth.create(
					berthAt({
						branch: HELD_BRANCH,
						id: ELSEWHERE,
						source: SHOAL_SOURCE,
						strandedAt,
					}),
				),
			]),
		);
	});

const berthStatuses = Effect.gen(function* () {
	const db = yield* Database;
	const rows = yield* db.Berth.all();
	return new Map(rows.map((row) => [row.id, row.status] as const));
});

const landTheChange = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	yield* writer.write(
		db.Change.where({ id: "change-open" }).update({ stage: "landed" }),
	);
});

it.live(
	"a berth backing a pending change outlives the sweep until it lands",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorder = yield* makeScriptedRunner;
			const scraps = yield* Ref.make(0);
			const now = yield* Clock.currentTimeMillis;
			const runner = scrapCounting(recorder.runner, scraps);
			yield* moored(new Date(now - EIGHT_DAYS_MILLIS)).pipe(
				Effect.provide(temporary.layer),
			);

			yield* Effect.provide(
				Effect.void,
				domainKernelLayer(temporary, scripted.backend, {}, runner),
			);
			const swept = yield* berthStatuses.pipe(Effect.provide(temporary.layer));
			expect(swept.get(HELD)).toBe("stranded");
			expect(swept.get(AT_WORK)).toBe("ready");
			expect(swept.get(SIBLING)).toBe("reclaimed");
			expect(swept.get(ELSEWHERE)).toBe("reclaimed");
			expect(yield* Ref.get(scraps)).toBe(0);

			// why: nothing about the worktrees changed — only the change resolved, and
			// that alone must be enough for the ordinary path to take both berths.
			yield* landTheChange.pipe(Effect.provide(temporary.layer));
			yield* Effect.provide(
				Effect.void,
				domainKernelLayer(temporary, scripted.backend, {}, runner),
			);
			const released = yield* berthStatuses.pipe(
				Effect.provide(temporary.layer),
			);
			expect(released.get(HELD)).toBe("reclaimed");
			expect(released.get(AT_WORK)).toBe("reclaimed");
			expect(yield* Ref.get(scraps)).toBe(0);
		}),
);
