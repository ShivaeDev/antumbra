import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { start } from "#rows/start.ts";
export const startRequested = fact("StartRequested", {
	wakeSessionId: Schema.NullOr(SessionId),
	id: start.fields.id,
	agentId: start.fields.agentId,
	sessionId: start.fields.sessionId,
	voyageId: start.fields.voyageId,
	pieceId: start.fields.pieceId,
	backend: start.fields.backend,
	model: start.fields.model,
	effort: start.fields.effort,
	role: start.fields.role,
	charter: start.fields.charter,
	toolSetVersion: start.fields.toolSetVersion,
});
