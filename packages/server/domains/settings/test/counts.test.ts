import { expect } from "vitest";
import { answered, it } from "#test/kit.ts";

it.app("answers every count with the value Antumbra holds until one is set", function* (app) {
	const answer = yield* answered(app.api.settings.counts({}));
	for (const setting of answer) {
		expect(setting.title.trim()).not.toBe("");
		expect(setting.description.trim()).not.toBe("");
	}
	expect(answer.map(({ count, key }) => ({ count, key }))).toEqual([
		{ count: 4, key: "maxParallelSessions" },
		{ count: 60, key: "idleSiestaMinutes" },
		{ count: 5, key: "routineMailMinutes" },
		{ count: 15, key: "retireRestMinutes" },
	]);
});

it.app("replacing a count preserves the other settings", function* (app) {
	yield* app.api.settings.setCount({ count: 8, key: "maxParallelSessions" });
	yield* app.api.settings.setCount({ count: 90, key: "idleSiestaMinutes" });
	yield* app.api.settings.setCount({ count: 12, key: "maxParallelSessions" });

	const answer = yield* answered(app.api.settings.counts({}));
	expect(answer.map(({ count, key }) => [key, count])).toEqual([
		["maxParallelSessions", 12],
		["idleSiestaMinutes", 90],
		["routineMailMinutes", 5],
		["retireRestMinutes", 15],
	]);
});
