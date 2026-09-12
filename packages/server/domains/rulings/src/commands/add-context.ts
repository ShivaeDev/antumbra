import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingContextAdded } from "#facts/ruling-context-added.ts";
import { ruling } from "#rows/ruling.ts";
export const addContext = command("addContext", {
	input: rulingContextAdded.payload,
	reads: [ruling],
	emits: rulingContextAdded,
	rejections: { ...rejections },
	run: Effect.fn("rulings.addContext")(function* (input, rows, reject) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
		const current = found.value;
		if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });

		return input;
	}),
});
