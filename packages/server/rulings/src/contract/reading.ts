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
import { Effect, Schema } from "effect";
export const Choices = query("choices", {
	payload: sourceChoices.input,
	success: sourceChoices.output,
	reads: () => [collection("ruling", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Replacements = query("replacements", {
	payload: sourceReplacements.input,
	success: sourceReplacements.output,
	reads: () => [collection("ruling", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Display = query("display", {
	payload: sourceDisplay.input,
	success: sourceDisplay.output,
	reads: () => [collection("rulingDisplay", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Binding = query("binding", {
	payload: sourceBinding.input,
	success: sourceBinding.output,
	reads: () => [collection("ruling", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ById = query("byId", {
	payload: sourceById.input,
	success: sourceById.output,
	reads: () => [collection("ruling", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Frontier = query("frontier", {
	payload: sourceFrontier.input,
	success: sourceFrontier.output,
	reads: () => [collection("ruling", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Open = query("open", {
	payload: sourceOpen.input,
	success: sourceOpen.output,
	reads: () => [collection("ruling", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Standing = query("standing", {
	payload: sourceStanding.input,
	success: sourceStanding.output,
	reads: () => [collection("ruling", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
