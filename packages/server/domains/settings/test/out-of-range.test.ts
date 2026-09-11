import { Effect } from "effect";
import { expect } from "vitest";
import { answered, it } from "#test/kit.ts";

it.app("refuses counts outside their key's range and keeps the chosen value", function* (app) {
	yield* app.api.settings.setCount({ count: 12, key: "maxParallelSessions" });

	for (const count of [0, 65]) {
		const refused = yield* Effect.flip(app.api.settings.setCount({ count, key: "maxParallelSessions" }));

		expect(refused).toMatchObject({ _tag: "OutOfRange", field: "count", key: "maxParallelSessions", max: 64, min: 1 });
		expect((yield* answered(app.api.settings.counts({}))).find(({ key }) => key === "maxParallelSessions")).toMatchObject({ count: 12 });
	}
});

it.app("accepts both edges of a count's range", function* (app) {
	for (const count of [1, 1440]) {
		yield* app.api.settings.setCount({ count, key: "idleSiestaMinutes" });

		expect((yield* answered(app.api.settings.counts({}))).find(({ key }) => key === "idleSiestaMinutes")).toMatchObject({ count });
	}
});
