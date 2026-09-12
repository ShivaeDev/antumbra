import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingWithdrawn } from "#facts/ruling-withdrawn.ts";
import { ruling } from "#rows/ruling.ts";
export const withdraw = command("withdraw", {
	input: rulingWithdrawn.payload,
	reads: [ruling],
	emits: rulingWithdrawn,
	rejections: { ...rejections },
	run: Effect.fn("rulings.withdraw")(function* (input, rows, reject) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
		const current = found.value;
		if (current.answer === null) return yield* reject.NotRuled({ rulingId: input.rulingId });
		if (current.supersession !== null || current.withdrawal !== null) return yield* reject.Retired({ rulingId: input.rulingId });
		return input;
	}),
});
