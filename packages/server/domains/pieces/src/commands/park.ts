import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Option, Schema } from "effect";
import { pieceParked } from "#facts/piece-parked.ts";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const park = command("park", {
	input: { id: PieceId },
	reads: [piece],
	emits: pieceParked,
	rejections: { Unknown: { id: Schema.String } },
	run: Effect.fn("pieces.park")(function* (input, rows, reject) {
		const stored = yield* rows.piece.find(input.id);
		if (Option.isNone(stored)) {
			return yield* reject.Unknown({ id: input.id });
		}
		const at = yield* Clock.currentTimeMillis;
		return { id: input.id, parkedAt: stored.value.parkedAt ?? new Date(at).toISOString() };
	}),
});
