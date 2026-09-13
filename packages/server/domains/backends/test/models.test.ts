import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";

const opus = { defaultEffort: "high", efforts: ["high"], isDefault: true, model: "opus", name: "Opus" };

const sonnet = { defaultEffort: null, efforts: [], isDefault: false, model: "sonnet", name: "Sonnet" };

it.app("refreshes one backend without changing another", function* (app) {
	const catalogue = app.api.backends;
	yield* catalogue.listModels({
		backend: "codex",
		failure: null,
		models: [{ model: "gpt", name: "GPT", defaultEffort: "medium", efforts: ["medium"], isDefault: true }],
	});
	yield* catalogue.listModels({ backend: "claude", failure: null, models: [opus, sonnet] });
	yield* catalogue.listModels({
		backend: "claude",
		failure: null,
		models: [{ ...sonnet, name: "Sonnet updated", efforts: ["low", "high"], isDefault: true }],
	});

	expect(yield* answered(catalogue.models({ backend: "claude" }))).toEqual([
		{
			backend: "claude",
			defaultEffort: null,
			efforts: ["low", "high"],
			id: "claude/sonnet",
			isDefault: true,
			model: "sonnet",
			name: "Sonnet updated",
		},
	]);
	expect(yield* answered(catalogue.efforts({ backend: "claude", model: "sonnet" }))).toEqual(["low", "high"]);
	expect(yield* answered(catalogue.efforts({ backend: "claude", model: "opus" }))).toEqual([]);
	expect(yield* answered(catalogue.models({ backend: "codex" }))).toEqual([
		{ backend: "codex", defaultEffort: "medium", efforts: ["medium"], id: "codex/gpt", isDefault: true, model: "gpt", name: "GPT" },
	]);
});
