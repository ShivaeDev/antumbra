import { Changes } from "@antumbra/changes";
import type { AgentSummary, Fleet } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import type { BackendCapacityReading } from "@antumbra/provider-capacity";
import { Repos } from "@antumbra/repos";
import { rootSessions } from "@antumbra/sessions";
import { RoleSettings } from "@antumbra/settings";
import { decodeStoredAgentStatus, decodeStoredBerthStatus, decodeStoredResourceReclaimState } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { situationsByAgent } from "#agent-situations.ts";
import { workByAgent } from "#agent-work.ts";
import { attributeIntents } from "#sight-diagnostics.ts";
import { type FleetRuntime, sessionSummary } from "#sight-fleet-sessions.ts";
import type { PendingIntent } from "#sight-intents.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";

export const fleetSnapshot = Effect.fn("Sight.fleetSnapshot")(function* (
	backends: ReadonlyArray<string>,
	imageInputBackends: ReadonlySet<string>,
	intents: ReadonlyArray<PendingIntent>,
	capacities: ReadonlyArray<BackendCapacityReading>,
	runtime: FleetRuntime,
) {
	const db = yield* Database;
	const registry = yield* Repos;
	const changes = yield* Changes;
	const storedAgents = yield* db.Agent.orderBy((agent) => agent.createdAt.asc()).all();
	const agents = yield* Effect.forEach(storedAgents, (agent) =>
		Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(Effect.map((status) => ({ ...agent, status }))),
	);
	const sessions = yield* db.AgentSession.where(rootSessions)
		.orderBy((session) => session.createdAt.asc())
		.all();
	const pointers = new Map(agents.map((agent) => [agent.id, agent.currentSessionId]));
	const attribution = attributeIntents(intents, new Set(agents.map((agent) => agent.id)), new Set(sessions.map((session) => session.id)));
	const assignments = yield* db.PieceAgent.orderBy((assignment) => assignment.assignedAt.asc()).all();
	const pieceIds = [...new Set(assignments.map((assignment) => assignment.pieceId))];
	const situations = situationsByAgent(assignments, yield* changes.situationsForPieces(pieceIds));
	const sessionSummaries = yield* Effect.forEach(sessions, (session) =>
		sessionSummary(session, imageInputBackends, runtime, attribution, pointers, situations),
	);
	const storedBerths = yield* db.Berth.orderBy((berth) => berth.createdAt.asc()).all();
	const berths = yield* Effect.forEach(storedBerths, (berth) =>
		Effect.all({
			reclaimState: Effect.fromResult(decodeStoredResourceReclaimState("Berth", berth.id, berth.reclaimState)),
			status: Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)),
		}).pipe(Effect.map((decoded) => ({ ...berth, ...decoded }))),
	);
	const repos = yield* registry.registered();
	const roleSettings = yield* (yield* RoleSettings).defaults();
	const crews = yield* db.VoyageAgent.where({ role: CAPTAIN_ROLE }).all();
	const memberships = yield* db.VoyagePiece.where((membership) => membership.pieceId.in(pieceIds)).all();
	const voyageIds = [...new Set([...memberships.map((membership) => membership.voyageId), ...crews.map((crew) => crew.voyageId)])];
	const work = workByAgent({
		assignments,
		crews,
		memberships,
		pieces: yield* db.Piece.where((piece) => piece.id.in(pieceIds)).all(),
		voyages: yield* db.Voyage.where((voyage) => voyage.id.in(voyageIds)).all(),
	});
	const sessionsByAgent = Map.groupBy(sessionSummaries, (session) => session.agentId);
	const berthsByAgent = Map.groupBy(berths, (berth) => berth.agentId);
	const summaries: ReadonlyArray<AgentSummary> = agents.map((agent) => ({
		berths: (berthsByAgent.get(agent.id) ?? []).map((berth) => ({
			branch: berth.branch,
			reclaimState: berth.reclaimState,
			slug: berth.slug,
			status: berth.status,
		})),
		// Retirement can close a stranded subtree, so it requires retirable Sessions rather than fully settled ones.
		canRetire: agent.status === "alive" && (sessionsByAgent.get(agent.id) ?? []).every((session) => session.retirable),
		charter: agent.charter,
		diag: {
			currentSessionId: agent.currentSessionId,
			intents: attribution.agents.get(agent.id) ?? [],
		},
		id: agent.id,
		role: agent.role,
		sessions: (sessionsByAgent.get(agent.id) ?? []).map((session) => ({
			addressable: session.addressable,
			backend: session.backend,
			canAttachImages: session.canAttachImages,
			canInterrupt: session.canInterrupt,
			canSend: session.canSend,
			canSleep: session.canSleep,
			cwd: session.cwd,
			diag: session.diag,
			id: session.id,
			presence: session.presence,
			status: session.status,
		})),
		status: agent.status,
		work: work.get(agent.id) ?? [],
	}));
	return {
		agents: summaries,
		backends,
		capacities: capacities.map((capacity) => ({
			backend: capacity.backend,
			detail: capacity.detail,
			reason: capacity.reason,
			resetsAt: capacity.resetsAt?.getTime() ?? null,
			status: capacity.status,
			utilization: capacity.utilization,
		})),
		diag: { intents: attribution.loose },
		repos,
		roleSettings,
	} satisfies Fleet;
});
