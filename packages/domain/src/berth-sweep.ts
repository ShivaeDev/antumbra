import {
	Database,
	type DatabaseService,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { BerthSite, Runner } from "@antumbra/plugin-api";
import { Clock, Effect } from "effect";
import { readBerthSweep } from "#berth-sweep-read.ts";

interface BerthRow {
	readonly agentId: string;
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

const judgeStranded = (runner: Runner, berth: BerthRow) =>
	Effect.gen(function* () {
		const verdict = yield* runner.reclaim(site(berth));
		if (verdict._tag === "dirty") {
			return;
		}
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(setStatus(db, berth, "reclaimed", null));
	});

// why: one stuck berth must not abort boot — its failure is logged and the
// sweep moves on; the berth stays in its current status for the next boot.
const guarded = <R>(berth: BerthRow, judge: Effect.Effect<void, unknown, R>) =>
	judge.pipe(
		Effect.catchCause((failure) =>
			Effect.logWarning("berth sweep skipped a berth", {
				berthId: berth.id,
				failure: String(failure),
			}),
		),
	);

// why: a held berth is where a crew answers red checks and reviews, so no
// sweep may reclaim it — the hold sits in front of the git verdict rather
// than beside it, and lifts on its own when the change resolves.
const unlessHeld = <R>(
	held: ReadonlyMap<string, string>,
	berth: BerthRow,
	sweep: Effect.Effect<void, unknown, R>,
) => {
	const changeId = held.get(berth.id);
	return changeId === undefined
		? guarded(berth, sweep)
		: Effect.logDebug(`held: change ${changeId} pending`, {
				berthId: berth.id,
			});
};

// why: runs after the agent sweep, so only an alive Agent tied to a running
// birth still owns its ready berths. Dormant and orphaned rows are reclaimable;
// unresolved changes independently hold either kind ahead of git work.
export const sweepBerths = (runners: ReadonlyMap<string, Runner>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const now = yield* Clock.currentTimeMillis;
		const alive = yield* db.Agent.where({ status: "alive" }).all();
		const aliveIds = new Set(alive.map((agent) => agent.id));
		const sweep = yield* readBerthSweep;
		const ready = sweep.ready.filter((berth) => !aliveIds.has(berth.agentId));
		yield* Effect.forEach(ready, (berth) => {
			const runner = runners.get(berth.runner);
			return runner === undefined
				? Effect.void
				: unlessHeld(
						sweep.held,
						berth,
						judgeReady(db, writer, runner, berth, now),
					);
		});
		yield* Effect.forEach(sweep.stranded, (berth) => {
			const runner = runners.get(berth.runner);
			return runner === undefined
				? Effect.void
				: unlessHeld(sweep.held, berth, judgeStranded(runner, berth));
		});
		if (ready.length + sweep.stranded.length > 0) {
			yield* Effect.logInfo("boot berth sweep finished", {
				ready: ready.length,
				stranded: sweep.stranded.length,
			});
		}
	});
