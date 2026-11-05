import { binding as sourceBinding } from "@antumbra/domain-rulings/queries/binding.ts";
import { byId as sourceById } from "@antumbra/domain-rulings/queries/by-id.ts";
import { choices as sourceChoices } from "@antumbra/domain-rulings/queries/choices.ts";
import { display as sourceDisplay } from "@antumbra/domain-rulings/queries/display.ts";
import { frontier as sourceFrontier } from "@antumbra/domain-rulings/queries/frontier.ts";
import { open as sourceOpen } from "@antumbra/domain-rulings/queries/open.ts";
import { replacements as sourceReplacements } from "@antumbra/domain-rulings/queries/replacements.ts";
import { standing as sourceStanding } from "@antumbra/domain-rulings/queries/standing.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const Choices = stream("choices", {
	payload: sourceChoices.input,
	success: sourceChoices.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Replacements = stream("replacements", {
	payload: sourceReplacements.input,
	success: sourceReplacements.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Display = stream("display", {
	payload: sourceDisplay.input,
	success: sourceDisplay.output,
	reads: () => [collection("rulingDisplay", Schema.String).list],
});
export const Binding = stream("binding", {
	payload: sourceBinding.input,
	success: sourceBinding.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const ById = stream("byId", {
	payload: sourceById.input,
	success: sourceById.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Frontier = stream("frontier", {
	payload: sourceFrontier.input,
	success: sourceFrontier.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Open = stream("open", {
	payload: sourceOpen.input,
	success: sourceOpen.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Standing = stream("standing", {
	payload: sourceStanding.input,
	success: sourceStanding.output,
	reads: () => [collection("ruling", Schema.String).list],
});
