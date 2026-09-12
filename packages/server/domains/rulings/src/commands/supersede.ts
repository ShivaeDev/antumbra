import { command } from "@antumbra/platform-feature/command.ts";
import { choice, titled } from "@antumbra/platform-feature/edit.ts";
import { Effect, Option } from "effect";
import { rejections, standing } from "#commands/guard.ts";
import { rulingSuperseded } from "#facts/ruling-superseded.ts";
import { RulingId } from "#ids.ts";
import { replacements } from "#queries/replacements.ts";
import { ruling } from "#rows/ruling.ts";
export const supersede = command("supersede", {
	input: {
		...rulingSuperseded.payload,
		byRulingId: titled(choice(replacements, { input: { rulingId: "rulingId" }, value: "id", label: "question" }), { title: "Replaced by" }),
	},
	reads: [ruling],
	emits: rulingSuperseded,
	rejections: { ...rejections, Self: { rulingId: RulingId } },
	run: Effect.fn("rulings.supersede")(function* (input, rows, reject) {
		if (input.rulingId === input.byRulingId) return yield* reject.Self({ rulingId: input.rulingId });
		for (const rulingId of [input.rulingId, RulingId.make(input.byRulingId)]) {
			const found = yield* rows.ruling.find(rulingId);
			if (Option.isNone(found)) return yield* reject.Unknown({ rulingId });
			if (found.value.answer === null) return yield* reject.NotRuled({ rulingId });
			if (!standing(found.value)) return yield* reject.Retired({ rulingId });
		}
		return { ...input, byRulingId: RulingId.make(input.byRulingId) };
	}),
});
