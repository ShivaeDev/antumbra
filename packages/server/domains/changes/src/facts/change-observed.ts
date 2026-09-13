import { fact } from "@antumbra/platform-feature/fact.ts";
import { migration } from "@antumbra/platform-feature/migration.ts";
import { Effect, Schema } from "effect";
import { change } from "#rows/change.ts";
import { changeFeedback } from "#rows/change-feedback.ts";
import { changeTransition } from "#rows/change-transition.ts";
export const changeObserved = fact("ChangeObserved", {
	change: Schema.NullOr(change.Row),
	transition: Schema.NullOr(changeTransition.Row),
	feedback: Schema.Array(changeFeedback.Row),
});

export const observedFeedback = migration(1, {
	fact: changeObserved.name,
	rewrite: (stored) => Effect.succeed({ ...stored, payload: { feedback: [], ...stored.payload } }),
});
