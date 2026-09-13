import { pending } from "@antumbra/domain-sessions/queries/pending.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { quietIds, voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { voyageAgent } from "#rows/voyage-agent.ts";

export const pendingOperations = query("pendingOperations", {
	input: {},
	output: Schema.Array(sessionOperation.Row),
	reads: [...pending.reads, session, voyageAgent, voyage],
	run: Effect.fn("Agents.pendingOperations")(function* (_input, rows) {
		const quiet = quietIds(yield* rows.voyage.where({}));
		const hushed = new Set((yield* rows.voyageAgent.where({})).filter((crew) => quiet.has(crew.voyageId)).map((crew) => String(crew.agentId)));
		const sailed = new Map((yield* rows.session.where({})).map((root) => [String(root.id), String(root.agentId)]));
		const sending: Array<typeof sessionOperation.Row.Type> = [];
		for (const operation of yield* pending.run({}, rows, {})) {
			const agentId = sailed.get(String(operation.sessionId));
			if (operation.gatedBy !== null && agentId !== undefined && hushed.has(agentId)) continue;
			sending.push(operation);
		}
		return sending;
	}),
});
