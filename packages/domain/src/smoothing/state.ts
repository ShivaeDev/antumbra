import { BoardScope, Boards } from "@antumbra/boards";
import type { BoardSmoothing } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Effect, Option, Schema } from "effect";
import { SMOOTH_TAG, SmoothPayload } from "#smoothing/fields.ts";

const storedPayload = Schema.decodeUnknownOption(Schema.fromJsonString(SmoothPayload));

const isFor = (voyageId: string) => (row: { readonly payload: string }) =>
	Option.match(storedPayload(row.payload), { onNone: () => false, onSome: (payload) => payload.voyageId === voyageId });

const stateOf = (status: string | undefined): BoardSmoothing["state"] => {
	if (status === undefined || status === "succeeded" || status === "cancelled") {
		return "idle";
	}
	return status === "failed" ? "failed" : "running";
};

export const makeSmoothingState = Effect.gen(function* () {
	const boards = yield* Boards;
	const db = yield* Database;
	return Effect.fnUntraced(function* (voyageId: string) {
		const days = yield* boards.uncovered(BoardScope.Voyage({ voyageId }));
		const passes = yield* db.Intent.where({ tag: SMOOTH_TAG })
			.orderBy((intent) => intent.updatedAt.desc())
			.all();
		return {
			state: stateOf(passes.find(isFor(voyageId))?.status),
			uncovered: days.reduce((total, day) => total + day.entries.length, 0),
		} satisfies BoardSmoothing;
	});
});
