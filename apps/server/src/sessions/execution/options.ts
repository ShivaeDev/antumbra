import { ToolCatalog } from "@antumbra/domain-agents/ports/tool-catalog.ts";
import { birthBySession } from "@antumbra/domain-agents/queries/birth-by-session.ts";
import { bornAs } from "@antumbra/domain-agents/rows/birth.ts";
import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { constrainedPrompt } from "#agents/charter.ts";
export const options = Effect.fn("Sessions.options")(function* (root: typeof session.Row.Type) {
	const live = yield* Live;
	const catalog = yield* ToolCatalog;
	const held = yield* live.read(birthBySession, { sessionId: root.id });
	if (held === null) return yield* Effect.die(new Error(`Session ${root.id} has no committed birth`));
	const voyage = held.voyageId === null ? null : yield* live.read(byId, { id: held.voyageId });
	const chosen = yield* live.read(resolve, { voyageId: held.voyageId, role: bornAs(held, voyage) });
	const model = chosen.model.value ?? held.model;
	if (model === null) return yield* Effect.die(new Error(`Session ${root.id} wakes on no model`));
	return {
		agentId: root.agentId,
		backend: root.backend,
		cwd: root.cwd,
		model,
		effort: chosen.effort.value,
		constrainedPrompt: yield* constrainedPrompt(held),
		toolSet: { version: root.toolSetVersion, tools: yield* catalog.byVersion(root.toolSetVersion) },
	};
});
