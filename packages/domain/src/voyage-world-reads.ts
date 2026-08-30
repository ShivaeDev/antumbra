import { Database, type PrismaError } from "@antumbra/persistence";
import { rootSessions } from "@antumbra/sessions";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	type InvalidSessionExecutionStatus,
	type StoredAgentSessionStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { decodeStoredVoyageKind, type StoredVoyageKindInvalid } from "@antumbra/vocabulary/voyage";
import { type Context, Effect } from "effect";
import { voyageRow } from "#voyage-row-projection.ts";
import type { AgentSessionRow, VoyageRow } from "#voyage-rows.ts";

// why: a session's two statuses and a voyage's kind are durable vocabulary
// rather than the strings their columns hold, so the aggregate refuses a row
// it cannot read instead of carrying an unknown word into a derivation.
export const readRootSessions: Effect.Effect<
	ReadonlyArray<AgentSessionRow>,
	InvalidSessionExecutionStatus | PrismaError | StoredAgentSessionStatusInvalid,
	Context.Service.Identifier<typeof Database>
> = Effect.gen(function* () {
	const db = yield* Database;
	return yield* Effect.forEach(yield* db.AgentSession.where(rootSessions).all(), (session) =>
		Effect.all({
			executionStatus: Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus)),
			status: Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status)),
		}).pipe(
			Effect.map(({ executionStatus, status }) => ({
				agentId: session.agentId,
				backend: session.backend,
				createdAt: session.createdAt,
				executionStatus,
				id: session.id,
				status,
			})),
		),
	);
});

export const readVoyages: Effect.Effect<
	ReadonlyArray<VoyageRow>,
	PrismaError | StoredVoyageKindInvalid,
	Context.Service.Identifier<typeof Database>
> = Effect.gen(function* () {
	const db = yield* Database;
	return yield* Effect.forEach(yield* db.Voyage.orderBy((voyage) => voyage.createdAt.asc()).all(), (voyage) =>
		Effect.fromResult(decodeStoredVoyageKind(voyage.id, voyage.kind)).pipe(Effect.map((kind) => voyageRow(voyage, kind))),
	);
});
