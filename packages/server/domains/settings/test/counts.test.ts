import { expect } from "vitest";
import { FLEET } from "#ids.ts";
import { answered, it } from "#test/kit.ts";

it.app("answers every count with the value Antumbra holds until one is set", function* (app) {
	expect(yield* answered(app.api.settings.counts({}))).toEqual([
		{ count: 4, key: "maxParallelSessions", title: "Maximum running agents" },
		{ count: 60, key: "idleSiestaMinutes", title: "Idle before siesta, in minutes" },
		{ count: 5, key: "routineMailMinutes", title: "Routine mail before a wake, in minutes" },
		{ count: 15, key: "retireRestMinutes", title: "Rest before retirement, in minutes" },
	]);
});

it.app("reads back a count that was set", function* (app) {
	yield* app.api.settings.setCount({ count: 12, key: "maxParallelSessions" });

	const answer = yield* answered(app.api.settings.counts({}));
	expect(answer.map(({ count, key }) => [key, count])).toEqual([
		["maxParallelSessions", 12],
		["idleSiestaMinutes", 60],
		["routineMailMinutes", 5],
		["retireRestMinutes", 15],
	]);
	expect(yield* app.rows.count.get("maxParallelSessions")).toEqual({ count: 12, key: "maxParallelSessions", scope: FLEET });
});
