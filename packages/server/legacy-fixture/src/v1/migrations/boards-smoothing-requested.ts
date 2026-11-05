import { fact } from "@antumbra/platform-feature/fact.ts";
import { BoardSmoothingRequestedPayload } from "@antumbra/platform-vocabulary/boards-event.ts";
import { Effect } from "effect";
import { migration } from "#v1/migration.ts";
export const smoothingRequested = fact("BoardSmoothingRequested", BoardSmoothingRequestedPayload.fields);
export const askedByAntumbra = migration(1, {
	fact: smoothingRequested.name,
	rewrite: (stored) => Effect.succeed({ ...stored, payload: { by: "antumbra", ...stored.payload } }),
});
