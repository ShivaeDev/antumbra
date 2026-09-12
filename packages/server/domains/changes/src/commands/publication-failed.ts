import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { ChangeId } from "#ids.ts";
import { change } from "#rows/change.ts";
export const publicationFailed = fact("ChangePublicationFailed", { change: Schema.NullOr(change.Row) });
export const failPublication = command("failPublication", {
	input: { changeId: ChangeId, attemptId: Schema.String, message: Schema.String },
	reads: [change],
	emits: publicationFailed,
	rejections: {},
	run: Effect.fn("changes.failPublication")(function* (input, rows) {
		const held = (yield* rows.change.where({ id: input.changeId }))[0];
		return {
			change:
				held === undefined || held.stage !== "prepared" || held.publicationRequestId !== input.attemptId
					? null
					: { ...held, publicationError: input.message },
		};
	}),
});
export const publicationFailedMaterializer = materializer(publicationFailed, {
	writes: [change],
	run: Effect.fn("changes.publicationFailed")(function* (fact, rows) {
		if (fact.change !== null) yield* rows.change.update(fact.change.id, fact.change);
	}),
});
