import { Database } from "@antumbra/persistence";
import type { AgentSessionCompleteness } from "@antumbra/vocabulary/agent-runtime";
import { projectHistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";
import { isRootSession, nodeSessionsOnly, openSessions } from "#roots.ts";

const GAP = "subsession.gap";

const gapKindOf = (row: { readonly kind: string; readonly payload: string }): ReadonlyArray<string> => {
	const projected = projectHistoricalAgentEvent(row.kind, row.payload);
	return projected._tag === "Known" && projected.event.type === GAP ? [projected.event.gapKind] : [];
};

const rawOf = (row: { readonly kind: string; readonly payload: string }): ReadonlyArray<string> => {
	const projected = projectHistoricalAgentEvent(row.kind, row.payload);
	return projected._tag === "Known" ? [projected.event.raw.payload] : [];
};

export const makeSessionTreeLedger = Effect.gen(function* () {
	const db = yield* Database;
	const gapKinds = (sessionId: string) =>
		db.SessionEvent.where({ kind: GAP, sessionId })
			.all()
			.pipe(Effect.map((rows) => rows.flatMap(gapKindOf)));
	const recorded = (sessionId: string) =>
		db.SessionEvent.where({ sessionId })
			.all()
			.pipe(Effect.map((rows) => rows.flatMap(rawOf)));
	const nodeRows = (rootSessionId: string) => db.AgentSession.where({ rootSessionId }).where(nodeSessionsOnly).all();
	const nodeRow = (rootSessionId: string, nativeRef: string) =>
		db.AgentSession.where({ nativeRef, rootSessionId })
			.first()
			.pipe(Effect.map(Option.flatMap((row) => (isRootSession(row) ? Option.none() : Option.some(row)))));
	const nodeById = (rootSessionId: string, id: string) => db.AgentSession.where({ id, rootSessionId }).where(nodeSessionsOnly).first();
	const awaitingAudit = (rootSessionId: string) =>
		db.AgentSession.where({ completeness: "recording", rootSessionId, status: "closed" }).where(nodeSessionsOnly).all();
	const openNodes = db.AgentSession.where(openSessions).where(nodeSessionsOnly).all();
	const settle = (sessionId: string, completeness: AgentSessionCompleteness) =>
		db.AgentSession.where({ id: sessionId, completeness: "recording" }).update({ completeness }).pipe(Effect.asVoid);
	return { awaitingAudit, gapKinds, nodeById, nodeRow, nodeRows, openNodes, recorded, settle };
});
