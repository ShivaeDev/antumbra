import { expect } from "vitest";
import { FLEET } from "#ids.ts";
import { answered, it } from "#test/kit.ts";

it.app("answers every flag with the value Antumbra holds until one is set", function* (app) {
	expect(yield* answered(app.api.settings.flags({}))).toEqual([
		{ key: "foldToolCalls", on: false, title: "Fold runs of tool calls" },
		{ key: "retireSweep", on: true, title: "Retire rested agents" },
		{ key: "holdEverything", on: false, title: "Hold everything" },
		{ key: "holdPieceDispatch", on: false, title: "Hold piece dispatch" },
		{ key: "holdWakes", on: false, title: "Hold wakes" },
	]);
});

it.app("reads back a flag that was set", function* (app) {
	yield* app.api.settings.setFlag({ key: "holdEverything", on: true });
	yield* app.api.settings.setFlag({ key: "retireSweep", on: false });

	const answer = yield* answered(app.api.settings.flags({}));
	expect(answer.map(({ key, on }) => [key, on])).toEqual([
		["foldToolCalls", false],
		["retireSweep", false],
		["holdEverything", true],
		["holdPieceDispatch", false],
		["holdWakes", false],
	]);
	expect(yield* app.rows.flag.get("holdEverything")).toEqual({ key: "holdEverything", on: true, scope: FLEET });
});
