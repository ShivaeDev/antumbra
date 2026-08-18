import { Database } from "@antumbra/persistence";
import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
	decodeStoredResourceReclaimState,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import type { HeldResourceRead } from "#held-resource-read.ts";

export const readResourceReclaimState = <E>(
	heldResourceRead: HeldResourceRead<E>,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const agents = yield* Effect.forEach(yield* db.Agent.all(), (row) =>
			Effect.fromResult(decodeStoredAgentStatus(row.id, row.status)).pipe(
				Effect.map((status) => ({ agentId: row.id, status })),
			),
		);
		const sessions = yield* Effect.forEach(
			yield* db.AgentSession.all(),
			(row) =>
				Effect.fromResult(
					decodeStoredAgentSessionStatus(row.id, row.status),
				).pipe(Effect.map((status) => ({ agentId: row.agentId, status }))),
		);
		const moorages = yield* Effect.forEach(yield* db.Moorage.all(), (row) =>
			Effect.all({
				reclaimState: Effect.fromResult(
					decodeStoredResourceReclaimState(
						"Moorage",
						row.agentId,
						row.reclaimState,
					),
				),
				status: Effect.fromResult(
					decodeStoredMoorageStatus(row.agentId, row.status),
				),
			}).pipe(Effect.map((decoded) => ({ ...row, ...decoded }))),
		);
		const berths = yield* Effect.forEach(yield* db.Berth.all(), (row) =>
			Effect.all({
				reclaimState: Effect.fromResult(
					decodeStoredResourceReclaimState("Berth", row.id, row.reclaimState),
				),
				status: Effect.fromResult(decodeStoredBerthStatus(row.id, row.status)),
			}).pipe(Effect.map((decoded) => ({ ...row, ...decoded }))),
		);
		return {
			agents,
			berths,
			held: yield* heldResourceRead.held(berths),
			moorages,
			sessions,
		};
	});

export type ResourceReclaimSnapshot = Effect.Success<
	ReturnType<typeof readResourceReclaimState>
>;
