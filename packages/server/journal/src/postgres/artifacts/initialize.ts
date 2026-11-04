import { ArtifactsEvent } from "@antumbra/platform-vocabulary/artifacts-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/artifacts/projection.ts";
import { rows } from "#postgres/artifacts/rows.ts";
export const initialize = Effect.fn("ArtifactsHistory.initialize")(function* () {
	const handles = yield* rows;
	const store = yield* makeEventStore({
		name: "artifacts",
		schema: ArtifactsEvent,
		version: 1,
		projections: [{ name: "artifacts", apply: apply(handles), reset }],
	});
	return { store, rows: handles };
})();
export type History = Effect.Success<typeof initialize>;
