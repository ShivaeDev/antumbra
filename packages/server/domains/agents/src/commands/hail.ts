import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { birthRequested } from "#facts/birth-requested.ts";
import { identity } from "#ids.ts";
import { captain } from "#queries/captain.ts";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";

export const hail = command("hail", {
	input: { voyageId: VoyageId, by: Schema.Literals(["admiral", "agent"]) },
	reads: [agent, pieceAgent, voyageAgent, session, voyage],
	emits: birthRequested,
	rejections: {
		UnknownVoyage: { id: Schema.String },
		CaptainAlreadyHailed: { agentId: Schema.String },
		CaptainSessionUnavailable: { agentId: Schema.String },
		CaptainStopped: { agentId: Schema.String },
		VoyageQuiet: { agentId: Schema.String },
		AgentExists: { id: Schema.String },
	},
	run: Effect.fn("Agents.hail")(function* (input, rows, reject) {
		const sailing = Option.getOrNull(yield* rows.voyage.find(input.voyageId));
		if (sailing === null) return yield* reject.UnknownVoyage({ id: input.voyageId });
		const ids = identity(input.requestId);
		const current = yield* captain.run({ voyageId: input.voyageId }, rows, {});
		if (current?.status === "spawning") return yield* reject.CaptainAlreadyHailed({ agentId: current.id });
		let wakeSessionId: null | typeof session.Row.Type.id = null;
		if (current?.status === "alive") {
			const roots = yield* rows.session.where({ agentId: current.id, parentSessionId: null, status: "open" });
			const root = roots.find((held) => held.id === current.currentSessionId);
			if (root === undefined) return yield* reject.CaptainSessionUnavailable({ agentId: current.id });
			if (root.stoppedAt !== null && input.by === "agent") return yield* reject.CaptainStopped({ agentId: current.id });
			if (sailing.quietedAt !== null && input.by === "agent") return yield* reject.VoyageQuiet({ agentId: current.id });
			wakeSessionId = root.id;
		} else if (Option.isSome(yield* rows.agent.find(ids.agentId))) return yield* reject.AgentExists({ id: ids.agentId });
		return {
			wakeSessionId,
			id: ids.birthId,
			source: input.by === "agent" ? ("hail" as const) : ("direct" as const),
			agentId: ids.agentId,
			sessionId: ids.sessionId,
			voyageId: input.voyageId,
			pieceId: null,
			backend: null,
			model: null,
			effort: null,
			role: "captain",
		};
	}),
});
