import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { changeArchived } from "#facts/change-archived.ts";
import { ChangeId } from "#ids.ts";
import { change } from "#rows/change.ts";
export const archive = command("archive", {
	input: { changeId: ChangeId },
	reads: [change],
	emits: changeArchived,
	rejections: { UnknownChange: { id: Schema.String }, ChangeStillOpen: { id: Schema.String, stage: Schema.String } },
	run: Effect.fn("changes.archive")(function* (input, rows, reject) {
		if (!(yield* rows.change.exists(input.changeId))) return yield* reject.UnknownChange({ id: input.changeId });
		const held = yield* rows.change.get(input.changeId);
		if (held.stage !== "landed" && held.stage !== "withdrawn") return yield* reject.ChangeStillOpen({ id: held.id, stage: held.stage });
		return { changeId: held.id };
	}),
});
