import { expect } from "vitest";
import { answered, it } from "#test/kit.ts";

it.app("answers every flag with the value Antumbra holds until one is set", function* (app) {
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

it.app("replacing a flag preserves the other settings", function* (app) {
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
