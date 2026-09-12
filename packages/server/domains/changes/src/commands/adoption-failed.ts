import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const adoptionFailed = fact("ChangeAdoptionFailed", { id: Schema.NullOr(Schema.String), message: Schema.String });
export const failAdoption = command("failAdoption", {
	input: { id: Schema.String, url: Schema.String, message: Schema.String },
	reads: [adoptionRequest],
	emits: adoptionFailed,
	rejections: {},
	run: Effect.fn("changes.failAdoption")(function* (input, rows) {
		const held = (yield* rows.changeAdoptionRequest.where({ id: input.id }))[0];
		return { id: held === undefined || held.url !== input.url ? null : held.id, message: input.message };
	}),
});
export const adoptionFailedMaterializer = materializer(adoptionFailed, {
	writes: [adoptionRequest],
	run: Effect.fn("changes.adoptionFailed")(function* (fact, rows) {
		if (fact.id !== null) yield* rows.changeAdoptionRequest.update(fact.id, { error: fact.message });
	}),
});
