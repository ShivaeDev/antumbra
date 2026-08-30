import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Clock, Effect, Ref } from "effect";
import { TestClock } from "effect/testing";
import { AgentDomain } from "#domain.ts";
import { changeOf, REEF_SOURCE } from "#test/change-fixtures.ts";
import { observed } from "#test/change-transition-fixtures.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, makeScriptedRunner } from "#test/harness.ts";
import { eventually } from "#test/voyage-fixtures.ts";

const EIGHT_DAYS_MILLIS = 8 * 24 * 60 * 60 * 1000;
const SHOAL_SOURCE = "/somewhere/shoal";
const HELD_BRANCH = "work/keeper/berth-0";
const HELD = "agent-keeper:held";
const AT_WORK = "agent-keeper:at-work";
const SIBLING = "agent-keeper:sibling";
const ELSEWHERE = "agent-keeper:elsewhere";
const LANDED_REPLACEMENT = changeOf({
	headRef: "work/keeper/replacement",
	id: "change-landed-replacement",
	repoId: "repo-reef",
	stage: "landed",
});

const countingRunner = (base: Runner, reclaims: Ref.Ref<number>, scraps: Ref.Ref<number>): Runner => ({
	...base,
	reclaim: (site) => Ref.update(reclaims, (count) => count + 1).pipe(Effect.andThen(base.reclaim(site))),
	scrap: () => Ref.update(scraps, (count) => count + 1),
});

const berthAt = (fields: { readonly branch: string; readonly id: string; readonly source: string; readonly strandedAt: Date | null }) => ({
	agentId: "agent-keeper",
	branch: fields.branch,
	id: fields.id,
	path: `/tmp/moorage/agent-keeper/${fields.id}`,
	reclaimState: null,
	ref: "main",
	runner: "local",
	slug: fields.id,
	source: fields.source,
	status: fields.strandedAt === null ? "ready" : "stranded",
	strandedAt: fields.strandedAt,
});

const moored = (strandedAt: Date) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "release settled resources",
			id: "agent-keeper",
			role: "keeper",
			status: "retired",
		});
		yield* db.Moorage.create({
			agentId: "agent-keeper",
			reclaimState: null,
			root: "/tmp/moorage/agent-keeper",
			runner: "local",
			status: "ready",
		});
		yield* db.Repo.create({
			defaultRef: "main",
			id: "repo-reef",
			name: "reef",
			source: REEF_SOURCE,
		});
		yield* db.Repo.create({
			defaultRef: "main",
			id: "repo-shoal",
			name: "shoal",
			source: SHOAL_SOURCE,
		});
		yield* db.Change.create(
			changeOf({
				headRef: HELD_BRANCH,
				id: "change-open",
				repoId: "repo-reef",
				stage: "open",
			}),
		);
		yield* db.PieceChange.create({
			changeId: "change-open",
			pieceId: "piece-open",
		});
		yield* db.Berth.create(
			berthAt({
				branch: HELD_BRANCH,
				id: HELD,
				source: REEF_SOURCE,
				strandedAt,
			}),
		);
		yield* db.Berth.create(
			berthAt({
				branch: HELD_BRANCH,
				id: AT_WORK,
				source: REEF_SOURCE,
				strandedAt: null,
			}),
		);
		yield* db.Berth.create(
			berthAt({
				branch: "work/keeper/berth-1",
				id: SIBLING,
				source: REEF_SOURCE,
				strandedAt,
			}),
		);
		yield* db.Berth.create(
			berthAt({
				branch: HELD_BRANCH,
				id: ELSEWHERE,
				source: SHOAL_SOURCE,
				strandedAt,
			}),
		);
	});

const replaceWithdrawnChange = (now: number) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Change.where({ id: "change-open" }).update({ stage: "withdrawn", withdrawnAt: new Date(now) });
		yield* db.Change.create(LANDED_REPLACEMENT);
		yield* db.PieceChange.create({ changeId: "change-landed-replacement", pieceId: "piece-open" });
	});

const berthStatuses = Effect.gen(function* () {
	const db = yield* Database;
	const rows = yield* db.Berth.all();
	return new Map(rows.map((row) => [row.id, row.status] as const));
});

const expectReclaimed = (released: ReadonlyMap<string, string>) =>
	Effect.sync(() => {
		expect(released.get(HELD)).toBe("reclaimed");
		expect(released.get(AT_WORK)).toBe("reclaimed");
		expect(released.get(SIBLING)).toBe("reclaimed");
		expect(released.get(ELSEWHERE)).toBe("reclaimed");
	});

it.effect("a landed change observation wakes reclaim without waiting for cadence", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const reclaims = yield* Ref.make(0);
		const scraps = yield* Ref.make(0);
		const now = yield* Clock.currentTimeMillis;
		const runner = countingRunner(recorder.runner, reclaims, scraps);
		yield* moored(new Date(now - EIGHT_DAYS_MILLIS)).pipe(Effect.provide(temporary.layer));

		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const swept = yield* berthStatuses;
			expect(swept.get(HELD)).toBe("stranded");
			expect(swept.get(AT_WORK)).toBe("ready");
			expect(swept.get(SIBLING)).toBe("stranded");
			expect(swept.get(ELSEWHERE)).toBe("stranded");
			expect(yield* Ref.get(reclaims)).toBe(0);
			expect(yield* Ref.get(scraps)).toBe(0);
			yield* Effect.yieldNow;

			const landing = observed(
				changeOf({
					headRef: HELD_BRANCH,
					id: "change-open",
					repoId: "repo-reef",
					stage: "open",
				}),
				"repo-reef",
				1,
				{ stage: "landed" },
			);
			const [landed] = yield* domain.changes.observed("scripted", [landing]);
			expect(landed?.stage).toBe("landed");
			yield* TestClock.withLive(eventually(berthStatuses.pipe(Effect.tap(expectReclaimed))));
			expect(yield* Ref.get(reclaims)).toBe(4);
			expect(yield* Ref.get(scraps)).toBe(0);

			yield* domain.changes.observed("scripted", [landing]);
			yield* TestClock.adjust(25);
			expect(yield* Ref.get(reclaims)).toBe(4);
			expect(yield* Ref.get(scraps)).toBe(0);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend, {}, runner, new Map(), { cadenceMillis: 60_000 })));
	}),
);

it.live("a landed replacement releases its withdrawn branch", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		const now = yield* Clock.currentTimeMillis;
		yield* moored(new Date(now - EIGHT_DAYS_MILLIS)).pipe(Effect.provide(temporary.layer));
		yield* replaceWithdrawnChange(now).pipe(Effect.provide(temporary.layer));

		yield* Effect.provide(Effect.void, domainKernelLayer(temporary, scripted.backend, {}, recorder.runner, new Map(), { cadenceMillis: 60_000 }));

		yield* berthStatuses.pipe(Effect.tap(expectReclaimed)).pipe(Effect.provide(temporary.layer));
	}),
);
