import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Clock } from "effect";
import { TestClock } from "effect/testing";

it.effectDB.each([1, 2])("isolates database writes and time for case %s", function* (_, db) {
	expect(yield* db.Agent.where({ id: "fixture-isolation" }).all()).toEqual([]);
	expect(yield* Clock.currentTimeMillis).toBe(0);
	yield* db.Agent.create({ charter: "test fixture isolation", id: "fixture-isolation", role: "hand", status: "alive" });
	yield* TestClock.adjust("1 second");
	expect(yield* Clock.currentTimeMillis).toBe(1000);
});
