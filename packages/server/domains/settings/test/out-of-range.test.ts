import { Effect } from "effect";
import { expect } from "vitest";
import { it } from "#test/kit.ts";

it.app("refuses a count outside the range its key allows and stores nothing", function* (app) {
	const refused = yield* Effect.flip(app.api.settings.setCount({ count: 0, key: "maxParallelSessions" }));

	expect(refused).toMatchObject({
		_tag: "OutOfRange",
		field: "count",
		key: "maxParallelSessions",
		max: 64,
		message: "Maximum running agents takes a whole number from 1 to 64",
		min: 1,
	});
	expect(yield* app.rows.count.count({})).toBe(0);
});

it.app("takes the count at the edge of the range", function* (app) {
	yield* app.api.settings.setCount({ count: 1440, key: "idleSiestaMinutes" });

	expect(yield* app.rows.count.get("idleSiestaMinutes")).toMatchObject({ count: 1440 });
});
