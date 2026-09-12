import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Option, Schema } from "effect";
import { pieceLaunched } from "#facts/piece-launched.ts";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const launch = command("launch", {
	input: { id: PieceId },
	reads: [piece],
	emits: pieceLaunched,
	rejections: { Unknown: { id: Schema.String } },
	run: Effect.fn("pieces.launch")(function* (input, rows, reject) {
		const stored = yield* rows.piece.find(input.id);
		if (Option.isNone(stored)) {
			return yield* reject.Unknown({ id: input.id });
		}
		const at = yield* Clock.currentTimeMillis;
		return { id: input.id, launchedAt: stored.value.launchedAt ?? new Date(at).toISOString() };
	}),
});
