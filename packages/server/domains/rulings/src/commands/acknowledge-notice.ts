import { command } from "@antumbra/platform-feature/command.ts";
import { Effect } from "effect";
import { rulingNoticeDelivered } from "#facts/ruling-notice-delivered.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const acknowledgeNotice = command("acknowledgeNotice", {
	input: rulingNoticeDelivered.payload,
	reads: [ruling],
	emits: rulingNoticeDelivered,
	rejections: { Unknown: { rulingId: RulingId } },
	run: Effect.fn("rulings.acknowledgeNotice")(function* (input, rows, reject) {
		if (!(yield* rows.ruling.exists(input.rulingId))) return yield* reject.Unknown({ rulingId: input.rulingId });
		return input;
	}),
});
