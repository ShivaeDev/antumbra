import { expect } from "vitest";
import { answered, it } from "#testing/entry.ts";

const codex = { efforts: ["low", "high"], isDefault: true, model: "gpt-5", name: "GPT-5" };

it.app("reads model efforts and returns none for an unknown model", function* (app) {
	const catalogue = app.api.backends;
	yield* catalogue.listModels({ backend: "codex", failure: null, models: [codex] });

	expect(yield* answered(catalogue.efforts({ backend: "codex", model: "gpt-5" }))).toEqual(["low", "high"]);
	expect(yield* answered(catalogue.efforts({ backend: "codex", model: "gpt-4" }))).toEqual([]);
});
