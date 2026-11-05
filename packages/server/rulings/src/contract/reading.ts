import { binding as sourceBinding } from "@antumbra/domain-rulings/queries/binding.ts";
import { byId as sourceById } from "@antumbra/domain-rulings/queries/by-id.ts";
import { choices as sourceChoices } from "@antumbra/domain-rulings/queries/choices.ts";
import { display as sourceDisplay } from "@antumbra/domain-rulings/queries/display.ts";
import { frontier as sourceFrontier } from "@antumbra/domain-rulings/queries/frontier.ts";
import { open as sourceOpen } from "@antumbra/domain-rulings/queries/open.ts";
import { replacements as sourceReplacements } from "@antumbra/domain-rulings/queries/replacements.ts";
import { standing as sourceStanding } from "@antumbra/domain-rulings/queries/standing.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const Choices = query("choices", {
	readPolicy: signedIn,
	payload: sourceChoices.input,
	success: sourceChoices.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Replacements = query("replacements", {
	readPolicy: signedIn,
	payload: sourceReplacements.input,
	success: sourceReplacements.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Display = query("display", {
	readPolicy: signedIn,
	payload: sourceDisplay.input,
	success: sourceDisplay.output,
	reads: () => [collection("rulingDisplay", Schema.String).list],
});
export const Binding = query("binding", {
	readPolicy: signedIn,
	payload: sourceBinding.input,
	success: sourceBinding.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const ById = query("byId", {
	readPolicy: signedIn,
	payload: sourceById.input,
	success: sourceById.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Frontier = query("frontier", {
	readPolicy: signedIn,
	payload: sourceFrontier.input,
	success: sourceFrontier.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Open = query("open", {
	readPolicy: signedIn,
	payload: sourceOpen.input,
	success: sourceOpen.output,
	reads: () => [collection("ruling", Schema.String).list],
});
export const Standing = query("standing", {
	readPolicy: signedIn,
	payload: sourceStanding.input,
	success: sourceStanding.output,
	reads: () => [collection("ruling", Schema.String).list],
});
