import { Effect } from "effect";
import {
	announce,
	type IntentChange,
	type SchedulerContext,
	transitionRow,
} from "#scheduler.ts";

// why: reclaim runs before the scheduler exists, so rows stranded by the
// previous process settle per policy in one write transaction and only then
// does admission start.
export const reclaim = (context: SchedulerContext) =>
	Effect.gen(function* () {
		const settled = yield* context.write(
			Effect.gen(function* () {
				const changes: Array<IntentChange> = [];
				const stale = yield* context.db.Intent.where({
					status: "running",
				}).all();
				for (const row of stale) {
					const kind = context.kinds.get(row.tag);
					const event =
						kind === undefined || kind.reclaim === "abandon"
							? "abandon"
							: "requeue";
					const detail =
						kind === undefined
							? `no registered intent kind for tag "${row.tag}"`
							: event === "abandon"
								? "abandoned by reclaim after restart"
								: undefined;
					changes.push(yield* transitionRow(context.db)(row.id, event, detail));
				}
				const cancelling = yield* context.db.Intent.where({
					status: "cancelling",
				}).all();
				for (const row of cancelling) {
					changes.push(yield* transitionRow(context.db)(row.id, "interrupt"));
				}
				return changes;
			}),
		);
		yield* Effect.forEach(settled, announce(context));
	});
