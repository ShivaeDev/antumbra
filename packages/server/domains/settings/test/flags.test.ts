import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";

it.app("reads default flags", function* (app) {
	const answer = yield* answered(app.api.settings.flags({}));
	for (const setting of answer) {
		expect(setting.title.trim()).not.toBe("");
		expect(setting.description.trim()).not.toBe("");
	}
	expect(answer.map(({ key, on }) => ({ key, on }))).toEqual([
		{ key: "foldToolCalls", on: false },
		{ key: "retireSweep", on: true },
		{ key: "holdEverything", on: false },
		{ key: "holdPieceDispatch", on: false },
		{ key: "holdWakes", on: false },
	]);
});

it.app("preserves other settings when replacing a flag", function* (app) {
	yield* app.api.settings.setFlag({ key: "holdEverything", on: false });
	yield* app.api.settings.setFlag({ key: "retireSweep", on: false });
	yield* app.api.settings.setFlag({ key: "holdEverything", on: true });

	const answer = yield* answered(app.api.settings.flags({}));
	expect(answer.map(({ key, on }) => [key, on])).toEqual([
		["foldToolCalls", false],
		["retireSweep", false],
		["holdEverything", true],
		["holdPieceDispatch", false],
		["holdWakes", false],
	]);
});
