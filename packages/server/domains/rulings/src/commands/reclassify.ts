import { command } from "@antumbra/platform-feature/command.ts";
import { optional, titled } from "@antumbra/platform-feature/edit.ts";
import { RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Effect, Option, Schema } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingReclassified } from "#facts/ruling-reclassified.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const reclassify = command("reclassify", {
	input: {
		...rulingReclassified.payload,
		radius: optional(RulingRadiusSchema, { title: "Radius" }),
		urgency: optional(RulingUrgencySchema, { title: "Urgency" }),
		note: optional(titled(Schema.String, { title: "Why", multiline: true }), { title: "Why" }),
	},
	reads: [ruling],
	emits: rulingReclassified,
	rejections: { ...rejections, Empty: { rulingId: RulingId } },
	run: Effect.fn("rulings.reclassify")(function* (input, rows, reject) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
		const current = found.value;
		if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
		if (input.radius === null && input.urgency === null) return yield* reject.Empty({ rulingId: input.rulingId });
		return input;
	}),
});
