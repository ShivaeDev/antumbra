import { Database } from "@antumbra/persistence";
import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
	decodeStoredResourceReclaimState,
} from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect } from "effect";
import { HeldResourceRead } from "#held-resource-read.ts";

const decodeAgent = (row: { readonly id: string; readonly status: string }) =>
	Effect.fromResult(decodeStoredAgentStatus(row.id, row.status)).pipe(Effect.map((status) => ({ agentId: row.id, status })));

const decodeSession = (row: { readonly agentId: string; readonly id: string; readonly status: string }) =>
	Effect.fromResult(decodeStoredAgentSessionStatus(row.id, row.status)).pipe(Effect.map((status) => ({ agentId: row.agentId, status })));

const decodeMoorage = (row: { readonly agentId: string; readonly reclaimState: string | null; readonly runner: string; readonly status: string }) =>
	Effect.all({
		reclaimState: Effect.fromResult(decodeStoredResourceReclaimState("Moorage", row.agentId, row.reclaimState)),
		status: Effect.fromResult(decodeStoredMoorageStatus(row.agentId, row.status)),
	}).pipe(Effect.map((decoded) => ({ ...row, ...decoded })));

const decodeBerth = (row: {
	readonly agentId: string;
	readonly branch: string;
	readonly id: string;
	readonly path: string;
	readonly reclaimState: string | null;
	readonly runner: string;
	readonly slug: string;
	readonly source: string;
	readonly status: string;
	readonly strandedAt: Date | null;
}) =>
	Effect.all({
		reclaimState: Effect.fromResult(decodeStoredResourceReclaimState("Berth", row.id, row.reclaimState)),
		status: Effect.fromResult(decodeStoredBerthStatus(row.id, row.status)),
	}).pipe(Effect.map((decoded) => ({ ...row, ...decoded })));

export const readResourceReclaimState = Effect.gen(function* () {
	const db = yield* Database;
	const heldResourceRead = yield* HeldResourceRead;
	const [retired, dormant, claimedMoorages, claimedBerths] = yield* Effect.all([
		db.Agent.where({ status: "retired" }).all(),
		db.Agent.where({ status: "dormant" }).all(),
		db.Moorage.where({ reclaimState: "claimed" }).all(),
		db.Berth.where({ reclaimState: "claimed" }).all(),
	]);
	const agentIds = [
		...new Set([
			...retired.map(({ id }) => id),
			...dormant.map(({ id }) => id),
			...claimedMoorages.map(({ agentId }) => agentId),
			...claimedBerths.map(({ agentId }) => agentId),
		]),
	];
	const rows = yield* Effect.all({
		agents: db.Agent.where((agent) => agent.id.in(agentIds)).all(),
		berths: db.Berth.where((berth) => berth.agentId.in(agentIds)).all(),
		moorages: db.Moorage.where((moorage) => moorage.agentId.in(agentIds)).all(),
		sessions: db.AgentSession.where((session) => session.agentId.in(agentIds)).all(),
	});
	const agents = yield* Effect.forEach(rows.agents, decodeAgent);
	const sessions = yield* Effect.forEach(rows.sessions, decodeSession);
	const moorages = yield* Effect.forEach(rows.moorages, decodeMoorage);
	const berthsByAgent = Map.groupBy(rows.berths, (berth) => berth.agentId);
	const berths = yield* Effect.forEach(
		agentIds.flatMap((agentId) => berthsByAgent.get(agentId) ?? []),
		decodeBerth,
	);
	return {
		agents,
		berths,
		held: yield* heldResourceRead.held(berths),
		moorages,
		sessions,
	};
});

export type ResourceReclaimSnapshot = Effect.Success<typeof readResourceReclaimState>;
