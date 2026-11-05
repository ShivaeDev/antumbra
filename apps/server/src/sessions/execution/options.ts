import { ToolCatalog } from "@antumbra/domain-agents/ports/tool-catalog.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Effect } from "effect";
import { constrainedPrompt } from "#agents/charter.ts";

export const options = Effect.fn("Sessions.options")(function* (root: typeof session.Row.Type) {
	const agentsService = yield* Agents;

	const catalog = yield* ToolCatalog;
	const held = yield* agentsService.birthBySession({ sessionId: root.id }).pipe(Effect.orDie);
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
