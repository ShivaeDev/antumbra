import { it } from "@antumbra/testing/rulings";
import { expect } from "@effect/vitest";
import { Effect } from "effect";

it.effectApp("provides rulings over a throwaway database", function* ({
	db,
	rulings,
}) {
	expect(yield* Effect.flip(rulings.get("ruling-missing"))).toMatchObject({
		_tag: "RulingNotFound",
		rulingId: "ruling-missing",
	});
	expect(yield* db.Ruling.all()).toEqual([]);
});
