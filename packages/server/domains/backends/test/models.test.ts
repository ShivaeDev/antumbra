import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";

const opus = { efforts: ["high"], isDefault: true, model: "opus", name: "Opus" };

const sonnet = { efforts: [], isDefault: false, model: "sonnet", name: "Sonnet" };

it.app("replaces the model listing", function* (app) {
	const catalogue = app.api.backends;
	yield* catalogue.listModels({ backend: "claude", failure: null, models: [opus, sonnet] });
	yield* catalogue.listModels({ backend: "claude", failure: null, models: [sonnet] });

	expect(yield* answered(catalogue.models({ backend: "claude" }))).toEqual([
		{ backend: "claude", efforts: [], id: "claude/sonnet", isDefault: false, model: "sonnet", name: "Sonnet" },
	]);
});
