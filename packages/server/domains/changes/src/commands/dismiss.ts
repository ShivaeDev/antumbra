import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { changeDismissed } from "#facts/change-dismissed.ts";
import { ChangeId } from "#ids.ts";
import { change } from "#rows/change.ts";
export const dismiss = command("dismiss", {
	input: { changeId: ChangeId },
	reads: [change],
	emits: changeDismissed,
	rejections: { UnknownChange: { id: Schema.String }, ChangeStillAlive: { id: Schema.String, stage: Schema.String } },
	run: Effect.fn("changes.dismiss")(function* (input, rows, reject) {
		if (!(yield* rows.change.exists(input.changeId))) return yield* reject.UnknownChange({ id: input.changeId });
		const held = yield* rows.change.get(input.changeId);
		if (held.stage !== "withdrawn") return yield* reject.ChangeStillAlive({ id: held.id, stage: held.stage });
		return { changeId: held.id };
	}),
});
