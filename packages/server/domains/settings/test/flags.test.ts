import { answered, it } from "@antumbra/app-testing/entry.ts";
import { SWITCH_KEYS } from "@antumbra/domain-settings/ids.ts";
import { expect } from "vitest";

const SWITCHES_ON = SWITCH_KEYS.map((key) => ({ key, on: true }));

it.app("reads default flags", function* (app) {
	const answer = yield* answered(app.api.settings.flags({}));
	for (const setting of answer) {
		expect(setting.title.trim()).not.toBe("");
		expect(setting.description.trim()).not.toBe("");
	}
	expect(answer.map(({ key, on }) => ({ key, on }))).toEqual([
		{ key: "foldToolCalls", on: false },
		{ key: "signChanges", on: true },
		{ key: "retireSweep", on: true },
		{ key: "holdEverything", on: false },
		...SWITCHES_ON,
	]);
});

it.app("preserves other settings when replacing a flag", function* (app) {
	yield* app.api.settings.setFlag({ key: "holdEverything", on: false });
	yield* app.api.settings.setFlag({ key: "retireSweep", on: false });
	yield* app.api.settings.setFlag({ key: "holdEverything", on: true });

	const answer = yield* answered(app.api.settings.flags({}));
	expect(answer.map(({ key, on }) => ({ key, on }))).toEqual([
		{ key: "foldToolCalls", on: false },
		{ key: "signChanges", on: true },
		{ key: "retireSweep", on: false },
		{ key: "holdEverything", on: true },
		...SWITCHES_ON,
	]);
});
