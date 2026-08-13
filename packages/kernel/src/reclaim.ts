import { Effect } from "effect";
import type { AnyIntentKind } from "#intent.ts";
import { announce, type SchedulerContext, transitionRow } from "#scheduler.ts";

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

const settleStrandedRunning = (context: SchedulerContext) =>
	Effect.gen(function* () {
		const stranded = yield* context.db.Intent.where({
			status: "running",
		}).all();
		return yield* Effect.forEach(stranded, (row) => {
			const plan = reclaimPlan(context.kinds.get(row.tag), row.tag);
			return transitionRow(context.db)(row.id, plan.event, plan.detail);
		});
	});

const settleStrandedCancelling = (context: SchedulerContext) =>
	Effect.gen(function* () {
		const stranded = yield* context.db.Intent.where({
			status: "cancelling",
		}).all();
		return yield* Effect.forEach(stranded, (row) =>
			transitionRow(context.db)(row.id, "interrupt"),
		);
	});

// why: reclaim runs before the scheduler exists, so rows stranded by the
// previous process settle per policy in one write transaction and only then
// does admission start.
export const reclaim = (context: SchedulerContext) =>
	Effect.gen(function* () {
		const settled = yield* context.write(
			Effect.gen(function* () {
				const running = yield* settleStrandedRunning(context);
				const cancelling = yield* settleStrandedCancelling(context);
				return [...running, ...cancelling];
			}),
		);
		yield* Effect.forEach(settled, announce(context));
	});
