import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const adoptionRetried = fact("ChangeAdoptionRetried", { id: Schema.String, url: Schema.String });
export const retryAdoption = command("retryAdoption", {
	input: adoptionRetried.payload,
	reads: [adoptionRequest],
	emits: adoptionRetried,
	rejections: { UnknownRequest: { id: Schema.String } },
	run: Effect.fn("changes.retryAdoption")(function* (input, rows, reject) {
		if (!(yield* rows.changeAdoptionRequest.exists(input.id))) return yield* reject.UnknownRequest({ id: input.id });
		return { id: input.id, url: input.url };
	}),
});
export const adoptionRetriedMaterializer = materializer(adoptionRetried, {
	writes: [adoptionRequest],
	run: Effect.fn("changes.adoptionRetried")(function* (fact, rows) {
		yield* rows.changeAdoptionRequest.update(fact.id, { url: fact.url, error: null });
	}),
});
