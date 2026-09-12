import type { WriteHandles } from "@antumbra/platform-feature/handles.ts";
import { Effect } from "effect";
import { change } from "#rows/change.ts";
import { changeTransition } from "#rows/change-transition.ts";
import { pieceChange } from "#rows/piece-change.ts";
export const storedRows = [change, pieceChange, changeTransition] as const;
export const storeChange = Effect.fn("changes.storeChange")(function* (rows: WriteHandles<typeof storedRows>, held: typeof change.Row.Type) {
	if (yield* rows.change.exists(held.id)) yield* rows.change.update(held.id, held);
	else yield* rows.change.insert(held);
});
export const storeLink = Effect.fn("changes.storeLink")(function* (rows: WriteHandles<typeof storedRows>, link: typeof pieceChange.Row.Type) {
	if (!(yield* rows.pieceChange.exists(link.id))) yield* rows.pieceChange.insert(link);
});
export const storeTransition = Effect.fn("changes.storeTransition")(function* (
	rows: WriteHandles<typeof storedRows>,
	transition: typeof changeTransition.Row.Type | null,
) {
	if (transition !== null && !(yield* rows.changeTransition.exists(transition.id))) yield* rows.changeTransition.insert(transition);
});
