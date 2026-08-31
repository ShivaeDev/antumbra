import { Effect } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";

const annotations = (payload: SpawnFields) =>
	payload.pieceId === undefined
		? { agentId: payload.agentId, sessionId: payload.sessionId }
		: {
				agentId: payload.agentId,
				pieceId: payload.pieceId,
				sessionId: payload.sessionId,
			};

// The trace sink indexes these attributes as columns; the kernel annotates the Intent id.
export const underSpawnedAgent = (payload: SpawnFields) => Effect.annotateSpans(annotations(payload));
