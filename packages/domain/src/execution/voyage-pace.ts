import { SettingsSource } from "@antumbra/contract";
import { Effect } from "effect";
import { pieceStates } from "#piece-state.ts";
import { related } from "#voyage/related.ts";
import { paceOf } from "#voyage-pace.ts";
import { countsOfVoyage } from "#voyage-view.ts";

export const voyagePace = Effect.fn("ExecutionSource.voyagePace")(function* (voyageId: string) {
	const settings = yield* SettingsSource;
	const rows = yield* related([voyageId]);
	const reading = yield* settings.current;
	return paceOf(countsOfVoyage(rows, pieceStates(rows), voyageId), reading.settings.maxParallelSessions);
});
