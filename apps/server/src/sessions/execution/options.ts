import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { bySession } from "@antumbra/domain-starts/queries/by-session.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
export const options = Effect.fn("Sessions.options")(function* (root: typeof session.Row.Type) {
	const live = yield* Live;
	const start = yield* live.read(bySession, { sessionId: root.id });
	if (start === null) return yield* Effect.die(new Error(`Session ${root.id} has no committed start`));
	return {
		agentId: root.agentId,
		backend: root.backend,
		cwd: root.cwd,
		model: start.model,
		effort: start.effort,
		constrainedPrompt: null,
		toolSet: { version: start.toolSetVersion, tools: start.tools },
	};
});
