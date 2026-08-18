import type { AgentSummary, Fleet, RepoSummary } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredResourceReclaimState,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { decodeSessionExecutionStatus } from "#session-execution-status.ts";

export const fleetSnapshot = (backends: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const storedAgents = yield* db.Agent.orderBy((agent) =>
			agent.createdAt.asc(),
		).all();
		const agents = yield* Effect.forEach(storedAgents, (agent) =>
			Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(
				Effect.map((status) => ({ ...agent, status })),
			),
		);
		const sessions = yield* db.AgentSession.orderBy((session) =>
			session.createdAt.asc(),
		).all();
		const sessionSummaries = yield* Effect.forEach(sessions, (session) =>
			Effect.all({
				executionStatus: Effect.fromResult(
					decodeSessionExecutionStatus(session.id, session.executionStatus),
				),
				status: Effect.fromResult(
					decodeStoredAgentSessionStatus(session.id, session.status),
				),
			}).pipe(
				Effect.map(({ executionStatus, status }) => ({
					agentId: session.agentId,
					backend: session.backend,
					canInterrupt: status === "open" && executionStatus === "active",
					cwd: session.cwd,
					id: session.id,
					status,
				})),
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
			charter: agent.charter,
			id: agent.id,
			role: agent.role,
			sessions: sessionSummaries
				.filter((session) => session.agentId === agent.id)
				.map((session) => ({
					backend: session.backend,
					canInterrupt: session.canInterrupt,
					cwd: session.cwd,
					id: session.id,
					status: session.status,
				})),
			status: agent.status,
		}));
		return { agents: summaries, backends, repos } satisfies Fleet;
	});
