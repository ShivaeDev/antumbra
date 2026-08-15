import { Database, Writer } from "@antumbra/persistence";
import { Effect } from "effect";
import type { AnyIntentKind } from "#intent.ts";
import { announce, transitionRow } from "#scheduler.ts";
import { SchedulerState } from "#state.ts";

interface ReclaimPlan {
	readonly detail?: string;
	readonly event: "abandon" | "requeue";
}

const reclaimPlan = (
	kind: AnyIntentKind | undefined,
	tag: string,
): ReclaimPlan => {
	if (kind === undefined) {
		return {
			detail: `no registered intent kind for tag "${tag}"`,
			event: "abandon",
		};
	}
	if (kind.reclaim === "abandon") {
		return { detail: "abandoned by reclaim after restart", event: "abandon" };
	}
	return { event: "requeue" };
};

const settleStrandedRunning = Effect.gen(function* () {
	const db = yield* Database;
	const { kinds } = yield* SchedulerState;
	const stranded = yield* db.Intent.where({ status: "running" }).all();
	return yield* Effect.forEach(stranded, (row) => {
		const plan = reclaimPlan(kinds.get(row.tag), row.tag);
		return transitionRow(row.id, plan.event, plan.detail);
	});
});

const settleStrandedCancelling = Effect.gen(function* () {
	const db = yield* Database;
	const stranded = yield* db.Intent.where({ status: "cancelling" }).all();
	return yield* Effect.forEach(stranded, (row) =>
		transitionRow(row.id, "interrupt"),
	);
});

// why: reclaim runs before the scheduler exists, so rows stranded by the
// previous process settle per policy in one write transaction and only then
// does admission start.
export const reclaim = Effect.gen(function* () {
	const writer = yield* Writer;
	const settled = yield* writer.write(
		Effect.gen(function* () {
			const running = yield* settleStrandedRunning;
			const cancelling = yield* settleStrandedCancelling;
			return [...running, ...cancelling];
		}),
	);
	if (settled.length > 0) {
		yield* Effect.logInfo("reclaim settled stranded intents", {
			count: settled.length,
		});
	}
	yield* Effect.forEach(settled, announce);
});
