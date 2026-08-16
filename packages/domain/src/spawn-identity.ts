import { Option } from "effect";
import type { SpawnFields } from "#spawn.ts";

export const spawnSessionIdentity = (payload: SpawnFields) => ({
	agentId: payload.agentId,
	pieceId: Option.fromUndefinedOr(payload.pieceId),
	sessionId: payload.sessionId,
	voyageId: Option.fromUndefinedOr(payload.voyageId),
});
