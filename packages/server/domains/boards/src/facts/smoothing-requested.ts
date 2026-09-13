import { fact } from "@antumbra/platform-feature/fact.ts";
import { migration } from "@antumbra/platform-feature/migration.ts";
import { Effect } from "effect";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

const { voyageId, pieceId, throughToday, requestedAt, id, by } = smoothingAttempt.fields;
export const smoothingRequested = fact("BoardSmoothingRequested", { id, voyageId, pieceId, throughToday, requestedAt, by });

export const askedByAntumbra = migration(1, {
	fact: smoothingRequested.name,
	rewrite: (stored) => Effect.succeed({ ...stored, payload: { by: "antumbra", ...stored.payload } }),
});
