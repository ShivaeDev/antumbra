import type { AgentSummary, Fleet, RepoSummary } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredResourceReclaimState,
	sessionPresence,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { rootSessions } from "#session-roots.ts";
import { attributeIntents } from "#sight-diagnostics.ts";
import type { PendingIntent } from "#sight-intents.ts";

export const fleetSnapshot = (
	backends: ReadonlyArray<string>,
	intents: ReadonlyArray<PendingIntent>,
	attached: ReadonlySet<string>,
) =>
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
		const sessionSummaries = yield* Effect.forEach(sessions, (session) =>
			Effect.all({
				executionStatus: Effect.fromResult(
					decodeSessionExecutionStatus(session.id, session.executionStatus),
				),
				status: Effect.fromResult(
					decodeStoredAgentSessionStatus(session.id, session.status),
				),
			}).pipe(
				Effect.map(({ executionStatus, status }) => {
					const running = status === "open" && executionStatus === "active";
					return {
						agentId: session.agentId,
						backend: session.backend,
						canInterrupt: running && attached.has(session.id),
						// why: words reach every Session that has not ended — one that is
						// listening takes them now, one whose process was reclaimed is
						// woken by them — so the only Session the admiral cannot speak to
						// is one there is nothing left to wake.
						canSend: status === "open",
						cwd: session.cwd,
						diag: {
							current: pointers.get(session.agentId) === session.id,
							execution: executionStatus,
							intents: attribution.sessions.get(session.id) ?? [],
						},
						id: session.id,
						presence: sessionPresence({
							attached: attached.has(session.id),
							executionStatus,
							open: status === "open",
						}),
						status,
					};
				}),
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
			diag: {
				currentSessionId: agent.currentSessionId,
				intents: attribution.agents.get(agent.id) ?? [],
			},
			id: agent.id,
			role: agent.role,
			sessions: sessionSummaries
				.filter((session) => session.agentId === agent.id)
				.map((session) => ({
					backend: session.backend,
					canInterrupt: session.canInterrupt,
					canSend: session.canSend,
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
			diag: { intents: attribution.loose },
			repos,
		} satisfies Fleet;
	});
