import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { bySession } from "@antumbra/domain-starts/queries/by-session.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
export const options = Effect.fn("Sessions.options")(function* (root: typeof session.Row.Type) {
	const live = yield* Live;
	const start = yield* live.read(bySession, { sessionId: root.id });
	if (start === null) return yield* Effect.die(new Error(`Session ${root.id} has no committed start`));
	let model: string | null = null;
	let effort: string | null = null;
	if (start.voyageId !== null) {
		let role: AgentRole = start.role === "smoother" ? "smoother" : "crew";
		if (start.role === "captain" && start.pieceId === null) {
			const voyage = yield* live.read(byId, { id: start.voyageId });
			role = voyage?.kind === "flagship" ? "flagship" : "captain";
		}
		const chosen = yield* live.read(resolve, { voyageId: start.voyageId, role });
		model = chosen.model;
		effort = chosen.effort;
	}
	return {
		agentId: root.agentId,
		backend: root.backend,
		cwd: root.cwd,
		model,
		effort,
		constrainedPrompt: start.constrainedPrompt,
		toolSet: { version: start.toolSetVersion, tools: start.tools },
	};
});
