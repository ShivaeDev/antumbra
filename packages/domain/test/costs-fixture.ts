import { CostSource } from "@antumbra/contract";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import type { DatabaseService, NewAgentSession } from "@antumbra/persistence";
import { SessionEventJournalLive } from "@antumbra/session-event-journal";
import type { UsageEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Layer, Option, Stream } from "effect";
import { CostSourceLive } from "#cost-source.ts";

export const costsLayer = CostSourceLive.pipe(Layer.provideMerge(SessionEventJournalLive), Layer.provideMerge(DomainFeedsLive));

export const costsView = Effect.gen(function* () {
	const source = yield* CostSource;
	return Option.getOrThrow(yield* Stream.runHead(source.costsFeed));
});

interface Turn {
	readonly at: Date;
	readonly cacheReadTokens?: number;
	readonly costUsd?: number;
	readonly inputTokens: number;
	readonly model?: string;
	readonly outputTokens: number;
	readonly seq: number;
	readonly sessionId: string;
}

const usageOf = (turn: Turn): typeof UsageEvent.Type => ({
	...(turn.cacheReadTokens === undefined ? {} : { cacheReadTokens: turn.cacheReadTokens }),
	...(turn.costUsd === undefined ? {} : { costUsd: turn.costUsd }),
	...(turn.model === undefined ? {} : { model: turn.model }),
	inputTokens: turn.inputTokens,
	outputTokens: turn.outputTokens,
	raw: { kind: "usage", payload: "{}", source: "scripted" },
	type: "usage",
});

export const spentTurn = (db: DatabaseService, turn: Turn) =>
	db.SessionEvent.create({
		at: turn.at,
		kind: "usage",
		payload: JSON.stringify(usageOf(turn)),
		seq: turn.seq,
		sessionId: turn.sessionId,
	});

export const crewedAgent = (db: DatabaseService, agentId: string, voyageId: string | null) =>
	Effect.gen(function* () {
		yield* db.Agent.create({ charter: "spend tokens", currentSessionId: null, id: agentId, role: "hand", status: "alive" });
		if (voyageId !== null) {
			yield* db.VoyageAgent.create({ agentId, role: "crew", voyageId });
		}
	});

interface Opening {
	readonly agentId: string;
	readonly backend: string;
	readonly id: string;
	readonly parentSessionId?: string;
}

export const openedSession = (db: DatabaseService, session: Opening) =>
	db.AgentSession.create({
		agentId: session.agentId,
		backend: session.backend,
		charterDeliveredAt: null,
		cwd: "/tmp/spend",
		executionStatus: "active",
		id: session.id,
		nativeRef: null,
		parentSessionId: session.parentSessionId ?? null,
		rootSessionId: session.parentSessionId ?? session.id,
		status: "open",
	} satisfies NewAgentSession);

export const openedVoyage = (db: DatabaseService, voyageId: string, name: string) =>
	db.Voyage.create({
		captainBackend: "claude",
		context: "",
		crewBackend: "claude",
		id: voyageId,
		name,
		northStar: "spend is visible",
	});
