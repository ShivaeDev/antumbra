import type { BerthStatus } from "@antumbra/agent-runtime-vocabulary";
import { Database, Writer } from "@antumbra/persistence";
import type { BerthSite, Runner } from "@antumbra/plugin-api";
import { Effect } from "effect";

export interface SweepBerth {
	readonly agentId: string;
	readonly branch: string;
	readonly id: string;
	readonly path: string;
	readonly runner: string;
	readonly slug: string;
	readonly source: string;
	readonly strandedAt: Date | null;
}

const site = (berth: SweepBerth): BerthSite => ({
	branch: berth.branch,
	path: berth.path,
	slug: berth.slug,
	source: berth.source,
});

// why: one stuck berth must not abort boot — its failure is logged and the
// sweep moves on; the berth stays in its current status for the next boot.
const guarded = <R>(
	berth: SweepBerth,
	judge: Effect.Effect<void, unknown, R>,
) =>
	judge.pipe(
		Effect.catchCause((failure) =>
			Effect.logWarning("berth sweep skipped a berth", {
				berthId: berth.id,
				failure: String(failure),
			}),
		),
	);

const unlessHeld = <R>(
	held: ReadonlyMap<string, string>,
	berth: SweepBerth,
	sweep: Effect.Effect<void, unknown, R>,
) => {
	const changeId = held.get(berth.id);
	return changeId === undefined
		? guarded(berth, sweep)
		: Effect.logDebug(`held: change ${changeId} pending`, {
				berthId: berth.id,
			});
};

export const makeBerthReclaimer = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const setStatus = (
		berth: SweepBerth,
		status: BerthStatus,
		strandedAt: Date | null,
	) => db.Berth.where({ id: berth.id }).update({ status, strandedAt });
	// why: the git verdict runs outside writer.write — holding the write slot
	// across subprocess calls would stall every other writer at boot.
	const ready = (
		runner: Runner,
		held: ReadonlyMap<string, string>,
		berth: SweepBerth,
		now: number,
	) =>
		unlessHeld(
			held,
			berth,
			Effect.gen(function* () {
				const verdict = yield* runner.reclaim(site(berth));
				if (verdict._tag === "reclaimed") {
					yield* writer.write(setStatus(berth, "reclaimed", null));
					return;
				}
				yield* writer.write(setStatus(berth, "stranded", new Date(now)));
			}),
		);
	const stranded = (
		runner: Runner,
		held: ReadonlyMap<string, string>,
		berth: SweepBerth,
	) =>
		unlessHeld(
			held,
			berth,
			Effect.gen(function* () {
				const verdict = yield* runner.reclaim(site(berth));
				if (verdict._tag === "dirty") {
					return;
				}
				yield* writer.write(setStatus(berth, "reclaimed", null));
			}),
		);
	return { ready, stranded };
});
