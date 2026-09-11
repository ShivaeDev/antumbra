import { expect } from "vitest";
import { FLEET } from "#ids.ts";
import { it } from "#test/kit.ts";

it.app("a second value for a key replaces the row rather than adding one", function* (app) {
	yield* app.api.settings.setFlag({ key: "holdWakes", on: true });
	yield* app.api.settings.setFlag({ key: "holdWakes", on: false });
	yield* app.api.settings.setCount({ count: 8, key: "maxParallelSessions" });
	yield* app.api.settings.setCount({ count: 12, key: "maxParallelSessions" });

	expect(yield* app.rows.flag.count({ scope: FLEET })).toBe(1);
	expect(yield* app.rows.flag.get("holdWakes")).toMatchObject({ on: false });
	expect(yield* app.rows.count.count({ scope: FLEET })).toBe(1);
	expect(yield* app.rows.count.get("maxParallelSessions")).toMatchObject({ count: 12 });
});
