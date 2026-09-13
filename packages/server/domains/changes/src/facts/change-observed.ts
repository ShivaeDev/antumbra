import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { change } from "#rows/change.ts";
import { changeTransition } from "#rows/change-transition.ts";
export const changeObserved = fact("ChangeObserved", {
	change: Schema.NullOr(change.Row),
	transition: Schema.NullOr(changeTransition.Row),
});
