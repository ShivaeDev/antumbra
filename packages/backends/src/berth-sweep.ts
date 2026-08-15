import {
	Database,
	type DatabaseService,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { BerthSite, Runner } from "@antumbra/plugin-api";
import { Clock, Effect } from "effect";

const STRANDED_TTL_MILLIS = 7 * 24 * 60 * 60 * 1000;

interface BerthRow {
	readonly branch: string;
	readonly id: string;
	readonly path: string;
	readonly runner: string;
	readonly slug: string;
	readonly source: string;
	readonly strandedAt: Date | null;
}

const site = (berth: BerthRow): BerthSite => ({
	branch: berth.branch,
	path: berth.path,
	slug: berth.slug,
	source: berth.source,
});

const setStatus = (
	db: DatabaseService,
	berth: BerthRow,
	status: string,
	strandedAt: Date | null,
) => db.Berth.where({ id: berth.id }).update({ status, strandedAt });

interface SweepWriter {
	readonly write: <A, E, R>(
		program: Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E | PrismaError, R | WriteExecutors>;
}

// why: the git verdict runs outside writer.write — holding the write slot
// across subprocess calls would stall every other writer at boot.
const judgeReady = (
	db: DatabaseService,
	writer: SweepWriter,
	runner: Runner,
	berth: BerthRow,
	now: number,
) =>
	Effect.gen(function* () {
		const verdict = yield* runner.reclaim(site(berth));
		if (verdict._tag === "reclaimed") {
			yield* writer.write(setStatus(db, berth, "reclaimed", null));
			return;
		}
		yield* writer.write(setStatus(db, berth, "stranded", new Date(now)));
	});

const expireStranded = (
	db: DatabaseService,
	writer: SweepWriter,
	runner: Runner,
	berth: BerthRow,
	now: number,
) =>
	Effect.gen(function* () {
		const strandedAt = berth.strandedAt?.getTime();
		if (strandedAt === undefined || now - strandedAt < STRANDED_TTL_MILLIS) {
			return;
		}
		yield* runner.scrap(site(berth));
		yield* writer.write(setStatus(db, berth, "reclaimed", berth.strandedAt));
	});

// why: one stuck berth must not abort boot — its failure is logged and the
// sweep moves on; the berth stays in its current status for the next boot.
const guarded = (
	berth: BerthRow,
	judge: Effect.Effect<void, unknown, WriteExecutors>,
) =>
	judge.pipe(
		Effect.catchCause((failure) =>
			Effect.logWarning("berth sweep skipped a berth", {
				berthId: berth.id,
				failure: String(failure),
			}),
		),
	);

// why: runs after the agent sweep — revival does not exist, so by now every
// agent is dormant and every ready berth is orphaned by construction.
export const sweepBerths = (runners: ReadonlyMap<string, Runner>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const now = yield* Clock.currentTimeMillis;
		const ready = yield* db.Berth.where({ status: "ready" }).all();
		const stranded = yield* db.Berth.where({ status: "stranded" }).all();
		yield* Effect.forEach(ready, (berth) => {
			const runner = runners.get(berth.runner);
			return runner === undefined
				? Effect.void
				: guarded(berth, judgeReady(db, writer, runner, berth, now));
		});
		yield* Effect.forEach(stranded, (berth) => {
			const runner = runners.get(berth.runner);
			return runner === undefined
				? Effect.void
				: guarded(berth, expireStranded(db, writer, runner, berth, now));
		});
		if (ready.length + stranded.length > 0) {
			yield* Effect.logInfo("boot berth sweep finished", {
				ready: ready.length,
				stranded: stranded.length,
			});
		}
	});
