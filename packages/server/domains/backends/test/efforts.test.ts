import { expect } from "vitest";
import { answered, it } from "#test/kit.ts";

const codex = { efforts: ["low", "high"], isDefault: true, model: "gpt-5", name: "GPT-5" };

it.app("answers with the named model's efforts, and with nothing for a model that was never listed", function* (app) {
	const catalogue = app.api.backends;
	yield* catalogue.listModels({ backend: "codex", failure: null, models: [codex] });

	expect(yield* answered(catalogue.efforts({ backend: "codex", model: "gpt-5" }))).toEqual(["low", "high"]);
	expect(yield* answered(catalogue.efforts({ backend: "codex", model: "gpt-4" }))).toEqual([]);
});
