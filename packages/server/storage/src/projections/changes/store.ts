import { change } from "@antumbra/domain-changes/rows/change.ts";
import { changeFeedback } from "@antumbra/domain-changes/rows/change-feedback.ts";
import { changeTransition } from "@antumbra/domain-changes/rows/change-transition.ts";
import { pieceChange } from "@antumbra/domain-changes/rows/piece-change.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const storedRows = [change, pieceChange, changeTransition, changeFeedback] as const;
export const storeChange = Effect.fn("changes.storeChange")(function* (held: typeof change.Row.Type) {
	const rows = yield* Records;

	if (
		yield* rows.change.count({ where: { id: held.id } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		yield* rows.change.updateVoid({ ...held, id: held.id }).pipe(Effect.orDie);
	else yield* rows.change.insertVoid(held).pipe(Effect.orDie);
});
export const storeLink = Effect.fn("changes.storeLink")(function* (link: typeof pieceChange.Row.Type) {
	const rows = yield* Records;

	if (
		!(yield* rows.pieceChange.count({ where: { id: link.id } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		yield* rows.pieceChange.insertVoid(link).pipe(Effect.orDie);
});
export const storeFeedback = Effect.fn("changes.storeFeedback")(function* (items: readonly (typeof changeFeedback.Row.Type)[]) {
	const rows = yield* Records;

	for (const item of items) {
		if (
			yield* rows.changeFeedback.count({ where: { id: item.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* rows.changeFeedback.updateVoid({ ...item, id: item.id }).pipe(Effect.orDie);
		else yield* rows.changeFeedback.insertVoid(item).pipe(Effect.orDie);
	}
});
export const storeTransition = Effect.fn("changes.storeTransition")(function* (transition: typeof changeTransition.Row.Type | null) {
	const rows = yield* Records;

	if (
		transition !== null &&
		!(yield* rows.changeTransition.count({ where: { id: transition.id } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		yield* rows.changeTransition.insertVoid(transition).pipe(Effect.orDie);
});
