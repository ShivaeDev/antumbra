import { Changes } from "@antumbra/changes";
import type { AgentSummary, Fleet, RepoSummary } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { rootSessions, situationsByAgent } from "@antumbra/sessions";
import {
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredResourceReclaimState,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import type { BackendCapacityReading } from "#backend-capacity.ts";
import { attributeIntents } from "#sight-diagnostics.ts";
import { type FleetRuntime, sessionSummary } from "#sight-fleet-sessions.ts";
import type { PendingIntent } from "#sight-intents.ts";

export const fleetSnapshot = (
	backends: ReadonlyArray<string>,
	imageInputBackends: ReadonlySet<string>,
	intents: ReadonlyArray<PendingIntent>,
	capacities: ReadonlyArray<BackendCapacityReading>,
	runtime: FleetRuntime,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const changes = yield* Changes;
		const storedAgents = yield* db.Agent.orderBy((agent) =>
			agent.createdAt.asc(),
		).all();
		const agents = yield* Effect.forEach(storedAgents, (agent) =>
			Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(
				Effect.map((status) => ({ ...agent, status })),
			),
		);
		const sessions = yield* db.AgentSession.where(rootSessions)
			.orderBy((session) => session.createdAt.asc())
			.all();
		const pointers = new Map(
			agents.map((agent) => [agent.id, agent.currentSessionId]),
		);
		const attribution = attributeIntents(
			intents,
			new Set(agents.map((agent) => agent.id)),
			new Set(sessions.map((session) => session.id)),
		);
		// why: the Changes an Agent is answering for are read in the same pass as
		// its Sessions, through the capability that owns them rather than off the
		// rows — a situation offered from a Change this snapshot never decoded
		// would be an affordance standing on unread truth.
		const snapshot = yield* changes.snapshot;
		const situations = situationsByAgent(
			{ ...snapshot, assignments: yield* db.PieceAgent.all() },
			agents.map((agent) => agent.id),
		);
		const sessionSummaries = yield* Effect.forEach(sessions, (session) =>
			sessionSummary(
				session,
				imageInputBackends,
				runtime,
				attribution,
				pointers,
				situations,
			),
		);
		const storedBerths = yield* db.Berth.orderBy((berth) =>
			berth.createdAt.asc(),
		).all();
		const berths = yield* Effect.forEach(storedBerths, (berth) =>
			Effect.all({
				reclaimState: Effect.fromResult(
					decodeStoredResourceReclaimState(
						"Berth",
						berth.id,
						berth.reclaimState,
					),
				),
				status: Effect.fromResult(
					decodeStoredBerthStatus(berth.id, berth.status),
				),
			}).pipe(Effect.map((decoded) => ({ ...berth, ...decoded }))),
		);
		const repos: ReadonlyArray<RepoSummary> = (yield* db.Repo.orderBy((repo) =>
			repo.createdAt.asc(),
		).all()).map((repo) => ({
			defaultRef: repo.defaultRef,
			id: repo.id,
			name: repo.name,
			source: repo.source,
		}));
		const summaries: ReadonlyArray<AgentSummary> = agents.map((agent) => ({
			berths: berths
				.filter((berth) => berth.agentId === agent.id)
				.map((berth) => ({
					branch: berth.branch,
					reclaimState: berth.reclaimState,
					slug: berth.slug,
					status: berth.status,
				})),
			// why: ending an Agent stops whatever it is doing, so the act is
			// withheld while any Session of its is mid-turn. It is deliberately a
			// weaker rule than rest: retirement is what closes a subtree the record
			// has stopped hearing from, and a tree nothing can settle would
			// otherwise have no way out at all.
			canRetire:
				agent.status === "alive" &&
				sessionSummaries
					.filter((session) => session.agentId === agent.id)
					.every((session) => session.retirable),
			charter: agent.charter,
			diag: {
				currentSessionId: agent.currentSessionId,
				intents: attribution.agents.get(agent.id) ?? [],
			},
			id: agent.id,
			role: agent.role,
			sessions: sessionSummaries
				.filter((session) => session.agentId === agent.id)
				.map((session) => ({
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
		} satisfies Fleet;
	});
