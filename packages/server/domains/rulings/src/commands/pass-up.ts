import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingPassedUp } from "#facts/ruling-passed-up.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const passUp = command("passUp", {
	input: rulingPassedUp.payload,
	reads: [ruling],
	emits: rulingPassedUp,
	rejections: { ...rejections, NotAtRung: { rulingId: RulingId, rung: Schema.NullOr(Schema.String) } },
	run: Effect.fn("rulings.passUp")(function* (input, rows, reject) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
		const current = found.value;
		if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
		if (current.rung !== input.by) return yield* reject.NotAtRung({ rulingId: input.rulingId, rung: current.rung });
		if (input.note.trim() === "") return yield* reject.Blank({ field: "note", message: "Say what you know before passing a question up" });
		return input;
	}),
});
