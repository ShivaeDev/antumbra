import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { restartRecorded } from "#facts/restart-recorded.ts";

export const record = command("record", {
	input: { runnerIds: Schema.Array(Schema.String) },
	reads: [session],
	emits: restartRecorded,
	rejections: {},
	run: Effect.fn("Lifecycle.record")(function* (input, rows) {
		const roots = yield* rows.session.where({ parentSessionId: null, status: "open", attached: true });
		return { sessionIds: roots.filter((root) => root.executionStatus !== "idle" && input.runnerIds.includes(root.runnerId)).map((root) => root.id) };
	}),
});
