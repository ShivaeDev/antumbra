import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { Effect, Option } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingParked } from "#facts/ruling-parked.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const park = command("park", {
	input: { ...rulingParked.payload, note: titled(rulingParked.payload.note, { title: "Not now", multiline: true }) },
	reads: [ruling],
	emits: rulingParked,
	rejections: { ...rejections, AlreadyParked: { rulingId: RulingId } },
	run: Effect.fn("rulings.park")(function* (input, rows, reject) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
		const current = found.value;
		if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
		if (current.parked !== null) return yield* reject.AlreadyParked({ rulingId: input.rulingId });
		return input;
	}),
});
