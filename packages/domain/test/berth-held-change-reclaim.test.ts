import { Database, Writer } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Clock, Effect, Ref, Schedule } from "effect";
import { AgentDomain } from "#domain.ts";
import { changeOf, REEF_SOURCE } from "#test/change-fixtures.ts";
import { observed } from "#test/change-transition-fixtures.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";

const EIGHT_DAYS_MILLIS = 8 * 24 * 60 * 60 * 1000;
const SHOAL_SOURCE = "/somewhere/shoal";
const HELD_BRANCH = "work/keeper/berth-0";
const HELD = "agent-keeper:held";
const AT_WORK = "agent-keeper:at-work";
const SIBLING = "agent-keeper:sibling";
const ELSEWHERE = "agent-keeper:elsewhere";

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

const countingRunner = (
	base: Runner,
	reclaims: Ref.Ref<number>,
	scraps: Ref.Ref<number>,
): Runner => ({
	...base,
	reclaim: (site) =>
		Ref.update(reclaims, (count) => count + 1).pipe(
			Effect.andThen(base.reclaim(site)),
		),
	scrap: () => Ref.update(scraps, (count) => count + 1),
});

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
		const writer = yield* Writer;
		yield* writer.write(
			Effect.all([
				db.Agent.create({
					charter: "release settled resources",
					id: "agent-keeper",
					role: "keeper",
					status: "retired",
				}),
				db.Moorage.create({
					agentId: "agent-keeper",
					reclaimState: null,
					root: "/tmp/moorage/agent-keeper",
					runner: "local",
					status: "ready",
				}),
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

const expectReclaimed = (released: ReadonlyMap<string, string>) =>
	Effect.sync(() => {
		expect(released.get(HELD)).toBe("reclaimed");
		expect(released.get(AT_WORK)).toBe("reclaimed");
		expect(released.get(SIBLING)).toBe("reclaimed");
		expect(released.get(ELSEWHERE)).toBe("reclaimed");
	});

it.live(
	"a landed change observation wakes reclaim without waiting for cadence",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorder = yield* makeScriptedRunner;
			const reclaims = yield* Ref.make(0);
			const scraps = yield* Ref.make(0);
			const now = yield* Clock.currentTimeMillis;
			const runner = countingRunner(recorder.runner, reclaims, scraps);
			yield* moored(new Date(now - EIGHT_DAYS_MILLIS)).pipe(
				Effect.provide(temporary.layer),
			);

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
				yield* eventually(berthStatuses.pipe(Effect.tap(expectReclaimed)));
				expect(yield* Ref.get(reclaims)).toBe(4);
				expect(yield* Ref.get(scraps)).toBe(0);

				yield* domain.changes.observed("scripted", [landing]);
				yield* Effect.sleep(25);
				expect(yield* Ref.get(reclaims)).toBe(4);
				expect(yield* Ref.get(scraps)).toBe(0);
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						scripted.backend,
						{},
						runner,
						new Map(),
						{ cadenceMillis: 60_000 },
					),
				),
			);
		}),
);
