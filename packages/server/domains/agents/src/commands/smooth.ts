import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { smoothingRequested } from "#facts/smoothing-requested.ts";
import { AgentId, identity } from "#ids.ts";
import { smoother } from "#queries/smoother.ts";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";

export const smooth = command("smooth", {
	input: { agentId: AgentId, sessionId: SessionId, voyageId: VoyageId, cwd: Schema.NullOr(Schema.String) },
	reads: [voyageAgent, agent, session, birth, voyage],
	emits: smoothingRequested,
	rejections: {
		UnknownVoyage: { id: Schema.String },
		WrongAgent: { id: Schema.String },
		Busy: { agentId: Schema.String },
		SessionExists: { id: Schema.String },
	},
	run: Effect.fn("Agents.smooth")(function* (input, rows, reject) {
		if (!(yield* rows.voyage.exists(input.voyageId))) return yield* reject.UnknownVoyage({ id: input.voyageId });
		const selected = yield* smoother.run({ voyageId: input.voyageId }, rows, {});
		const existing = yield* rows.agent.find(input.agentId);
		if ((selected !== null && selected.id !== input.agentId) || (selected === null && Option.isSome(existing)))
			return yield* reject.WrongAgent({ id: input.agentId });
		if ((yield* rows.session.exists(input.sessionId)) || (yield* rows.birth.where({ sessionId: input.sessionId })).length > 0)
			return yield* reject.SessionExists({ id: input.sessionId });
		if (
			(yield* rows.session.where({ agentId: input.agentId, status: "open" })).length > 0 ||
			(yield* rows.birth.where({ agentId: input.agentId })).some((value) => ["requested", "admitted", "running", "waiting"].includes(value.status))
		)
			return yield* reject.Busy({ agentId: input.agentId });
		return {
			id: identity(input.requestId).birthId,
			agentId: input.agentId,
			sessionId: input.sessionId,
			voyageId: input.voyageId,
			createsAgent: Option.isNone(existing),
			cwd: input.cwd,
		};
	}),
});
