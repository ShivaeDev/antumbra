import { smoother } from "@antumbra/domain-agents/queries/smoother.ts";
import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { smoothingRequested } from "#facts/smoothing-requested.ts";
import { StartId } from "#ids.ts";
import { start } from "#rows/start.ts";

const { id: _id, createsAgent: _creates, source: _source, role: _role, pieceId: _piece, ...fields } = smoothingRequested.payload;
export const smooth = command("smooth", {
	input: { ...fields, voyageId: VoyageId },
	reads: [voyageAgent, agent, session, start, voyage],
	emits: smoothingRequested,
	rejections: {
		UnknownVoyage: { id: Schema.String },
		WrongAgent: { id: Schema.String },
		Busy: { agentId: Schema.String },
		SessionExists: { id: Schema.String },
	},
	run: Effect.fn("Starts.smooth")(function* (input, rows, reject) {
		if (!(yield* rows.voyage.exists(input.voyageId))) return yield* reject.UnknownVoyage({ id: input.voyageId });
		const selected = yield* smoother.run({ voyageId: input.voyageId }, rows);
		const existing = yield* rows.agent.find(input.agentId);
		if ((selected !== null && selected.id !== input.agentId) || (selected === null && Option.isSome(existing)))
			return yield* reject.WrongAgent({ id: input.agentId });
		if ((yield* rows.session.exists(input.sessionId)) || (yield* rows.start.where({ sessionId: input.sessionId })).length > 0)
			return yield* reject.SessionExists({ id: input.sessionId });
		if (
			(yield* rows.session.where({ agentId: input.agentId, status: "open" })).length > 0 ||
			(yield* rows.start.where({ agentId: input.agentId })).some((value) => ["requested", "admitted", "running", "waiting"].includes(value.status))
		)
			return yield* reject.Busy({ agentId: input.agentId });
		return {
			id: StartId.make(input.requestId),
			agentId: input.agentId,
			sessionId: input.sessionId,
			voyageId: input.voyageId,
			pieceId: null,
			backend: input.backend,
			model: input.model,
			effort: input.effort,
			role: "smoother",
			charter: input.charter,
			source: "direct" as const,
			toolSetVersion: input.toolSetVersion,
			tools: input.tools,
			createsAgent: Option.isNone(existing),
			constrainedPrompt: input.constrainedPrompt,
			cwd: input.cwd,
		};
	}),
});
