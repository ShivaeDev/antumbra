import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { birth } from "#rows/birth.ts";

export const birthRequested = fact("BirthRequested", {
	wakeSessionId: Schema.NullOr(SessionId),
	id: birth.fields.id,
	source: birth.fields.source,
	agentId: birth.fields.agentId,
	sessionId: birth.fields.sessionId,
	voyageId: birth.fields.voyageId,
	pieceId: birth.fields.pieceId,
	backend: birth.fields.backend,
	model: birth.fields.model,
	effort: birth.fields.effort,
	role: birth.fields.role,
});
