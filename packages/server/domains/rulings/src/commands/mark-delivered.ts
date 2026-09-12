import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingDelivered } from "#facts/ruling-delivered.ts";
import { ruling } from "#rows/ruling.ts";
export const markDelivered = command("markDelivered", {
	input: rulingDelivered.payload,
	reads: [ruling],
	emits: rulingDelivered,
	rejections: { ...rejections },
	run: Effect.fn("rulings.markDelivered")(function* (input, rows, reject) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });

		return input;
	}),
});
