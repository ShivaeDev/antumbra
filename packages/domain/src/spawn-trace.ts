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

// why: the ids are put on the birth's whole scope rather than on one span, so
// everything opened on the new Agent's behalf carries them and a dev trace
// answers "what happened to this Session" by the id it was searched by instead
// of by walking each span back through its parents. The names are the ones the
// trace sink lifts out of a span's attributes into columns of its own; the
// Intent id is already annotated by the kernel around every Intent it runs.
export const underSpawnedAgent = (payload: SpawnFields) => Effect.annotateSpans(annotations(payload));
