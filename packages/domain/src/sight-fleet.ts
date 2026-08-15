import type { AgentSummary, Fleet } from "@antumbra/contract";
import type { DatabaseService } from "@antumbra/persistence";
import { Effect } from "effect";

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
		const berths = yield* db.Berth.orderBy((berth) =>
			berth.createdAt.asc(),
		).all();
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
			sessions: sessions
				.filter((session) => session.agentId === agent.id)
				.map((session) => ({
					backend: session.backend,
					cwd: session.cwd,
					id: session.id,
					status: session.status,
				})),
			status: agent.status,
		}));
		return { agents: summaries, backends } satisfies Fleet;
	});
