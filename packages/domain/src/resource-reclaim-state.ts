import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
	decodeStoredResourceReclaimState,
} from "@antumbra/agent-runtime-vocabulary";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { heldBerths } from "#held-berths.ts";

export const readResourceReclaimState = Effect.gen(function* () {
	const db = yield* Database;
	const agents = yield* Effect.forEach(yield* db.Agent.all(), (row) =>
		Effect.fromResult(decodeStoredAgentStatus(row.id, row.status)).pipe(
			Effect.map((status) => ({ agentId: row.id, status })),
		),
	);
	const sessions = yield* Effect.forEach(yield* db.AgentSession.all(), (row) =>
		Effect.fromResult(decodeStoredAgentSessionStatus(row.id, row.status)).pipe(
			Effect.map((status) => ({ agentId: row.agentId, status })),
		),
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
	const changes = yield* Effect.forEach(yield* db.Change.all(), changeRow);
	const pieceChanges = yield* Effect.forEach(
		yield* db.PieceChange.all(),
		pieceChangeRow,
	);
	return {
		agents,
		berths,
		held: heldBerths(berths, changes, yield* db.Repo.all(), pieceChanges),
		moorages,
		sessions,
	};
});
