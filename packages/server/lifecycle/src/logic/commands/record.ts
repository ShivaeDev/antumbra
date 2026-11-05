import type * as Source from "@antumbra/domain-lifecycle/commands/record.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const record = Effect.fn("Lifecycle.record")(function* (
	input: typeof Source.record.Input.Type,
): Effect.fn.Return<typeof Source.record.emits.Payload.Type, RejectedBy<typeof Source.record.rejections>, Records> {
	const rows = yield* Records;

	const roots = yield* rows.session
		.findMany({
			where: { parentSessionId: null, status: "open", attached: true },
			orderBy: { field: "storage_order", direction: "asc" },
			select: sessionSelection,
		})
		.pipe(Effect.orDie);
	return { sessionIds: roots.filter((root) => root.executionStatus !== "idle" && input.runnerIds.includes(root.runnerId)).map((root) => root.id) };
});
