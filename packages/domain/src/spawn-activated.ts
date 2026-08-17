import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Effect, Option, Result } from "effect";
import { decodeSessionExecutionStatus } from "#session-execution-status.ts";
import type { SpawnFields } from "#spawn.ts";

interface AgentRow {
	readonly charter: string;
	readonly role: string;
	readonly status: string;
}

interface BerthRow {
	readonly runner: string;
	readonly status: string;
}

interface MoorageRow {
	readonly root: string;
	readonly runner: string;
	readonly status: string;
}

interface SessionRow {
	readonly agentId: string;
	readonly backend: string;
	readonly charterDeliveredAt: Date | null;
	readonly cwd: string;
	readonly nativeRef: string | null;
	readonly executionStatus: unknown;
	readonly status: string;
}

const matchesAgent = (row: AgentRow, payload: SpawnFields) =>
	row.status === "alive" &&
	row.charter === payload.charter &&
	row.role === payload.role;

const matchesSession = (row: SessionRow, payload: SpawnFields) => {
	const executionStatus = decodeSessionExecutionStatus(
		payload.sessionId,
		row.executionStatus,
	);
	return (
		row.agentId === payload.agentId &&
		row.backend === payload.backend &&
		row.status === "open" &&
		Result.isSuccess(executionStatus) &&
		executionStatus.success === "active" &&
		row.nativeRef !== null &&
		row.charterDeliveredAt !== null
	);
};

const matchesMoorage = (
	row: MoorageRow,
	session: SessionRow,
	payload: SpawnFields,
) =>
	row.runner === payload.runner &&
	row.status === "ready" &&
	row.root === session.cwd;

const matchesBerth = (row: BerthRow, payload: SpawnFields) =>
	row.runner === payload.runner && row.status === "ready";

export const makeIsActivatedBirth = Effect.gen(function* () {
	const db = yield* Database;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const agentMatches = (payload: SpawnFields) =>
		provide(db.Agent.where({ id: payload.agentId }).first()).pipe(
			Effect.map((agent) =>
				Option.isSome(agent) ? matchesAgent(agent.value, payload) : false,
			),
		);
	const resourcesMatch = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const session = yield* provide(
				db.AgentSession.where({ id: payload.sessionId }).first(),
			);
			const moorage = yield* provide(
				db.Moorage.where({ agentId: payload.agentId }).first(),
			);
			if (
				Option.isNone(session) ||
				!matchesSession(session.value, payload) ||
				Option.isNone(moorage)
			) {
				return false;
			}
			return matchesMoorage(moorage.value, session.value, payload);
		});
	const berthsMatch = (payload: SpawnFields) =>
		provide(db.Berth.where({ agentId: payload.agentId }).all()).pipe(
			Effect.map((berths) =>
				berths.every((berth) => matchesBerth(berth, payload)),
			),
		);
	const pieceAssignmentMatches = (payload: SpawnFields) => {
		if (payload.pieceId === undefined) {
			return Effect.succeed(true);
		}
		return provide(
			db.PieceAgent.where({
				agentId: payload.agentId,
				pieceId: payload.pieceId,
			}).first(),
		).pipe(Effect.map(Option.isSome));
	};
	const voyageAssignmentMatches = (payload: SpawnFields) => {
		if (payload.voyageId === undefined) {
			return Effect.succeed(true);
		}
		return provide(
			db.VoyageAgent.where({
				agentId: payload.agentId,
				voyageId: payload.voyageId,
			}).first(),
		).pipe(
			Effect.map((voyage) =>
				Option.isSome(voyage) ? voyage.value.role === payload.role : false,
			),
		);
	};
	return (payload: SpawnFields) =>
		Effect.all(
			[
				agentMatches(payload),
				resourcesMatch(payload),
				berthsMatch(payload),
				pieceAssignmentMatches(payload),
				voyageAssignmentMatches(payload),
			],
			{ concurrency: 1 },
		).pipe(Effect.map((matches) => matches.every(Boolean)));
});
