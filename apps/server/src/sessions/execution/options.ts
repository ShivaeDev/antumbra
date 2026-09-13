import { ToolCatalog } from "@antumbra/domain-agents/ports/tool-catalog.ts";
import { birthBySession } from "@antumbra/domain-agents/queries/birth-by-session.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { constrainedPrompt } from "#agents/charter.ts";

export const options = Effect.fn("Sessions.options")(function* (root: typeof session.Row.Type) {
	const live = yield* Live;
	const catalog = yield* ToolCatalog;
	const held = yield* live.read(birthBySession, { sessionId: root.id });
	if (held === null) return yield* Effect.die(new Error(`Session ${root.id} has no committed birth`));
	if (held.backend === null || held.model === null) return yield* Effect.die(new Error(`Session ${root.id} wakes before its birth was admitted`));
	return {
		agentId: root.agentId,
		backend: held.backend,
		cwd: root.cwd,
		model: held.model,
		effort: held.effort,
		constrainedPrompt: yield* constrainedPrompt(held),
		toolSet: { version: root.toolSetVersion, tools: yield* catalog.byVersion(root.toolSetVersion) },
	};
});
