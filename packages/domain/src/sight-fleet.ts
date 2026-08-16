import type { AgentSummary, Fleet, RepoSummary } from "@antumbra/contract";
import type { DatabaseService } from "@antumbra/persistence";
import { Effect } from "effect";
import { decodeSessionExecutionStatus } from "#session-execution-status.ts";

export const fleetSnapshot = (
	db: DatabaseService,
	backends: ReadonlyArray<string>,
) =>
	Effect.gen(function* () {
		const agents = yield* db.Agent.orderBy((agent) =>
			agent.createdAt.asc(),
		).all();
		const sessions = yield* db.AgentSession.orderBy((session) =>
			session.createdAt.asc(),
		).all();
		const sessionSummaries = yield* Effect.forEach(sessions, (session) =>
			Effect.fromResult(
				decodeSessionExecutionStatus(session.id, session.executionStatus),
			).pipe(
				Effect.map((executionStatus) => ({
					agentId: session.agentId,
					backend: session.backend,
					canInterrupt:
						session.status === "open" && executionStatus === "active",
					cwd: session.cwd,
					id: session.id,
					status: session.status,
				})),
			),
		);
		const berths = yield* db.Berth.orderBy((berth) =>
			berth.createdAt.asc(),
		).all();
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
