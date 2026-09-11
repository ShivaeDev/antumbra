import { TestClock } from "effect/testing";
import { expect } from "vitest";
import { VoyageId } from "#ids.ts";
import { answered, it, opening } from "#test/kit.ts";

it.app("lists the voyages oldest first and reads one by its id", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* TestClock.adjust("1 minute");
	yield* app.api.voyages.open({ ...opening, name: "Sound the shallows" });

	const listed = yield* answered(app.api.voyages.list({}));
	expect(listed.map((row) => row.name)).toEqual(["Chart the reef", "Sound the shallows"]);

	const reef = listed[0];
	expect(yield* answered(app.api.voyages.byId({ id: VoyageId.make(reef?.id ?? "") }))).toMatchObject({ name: "Chart the reef" });
	expect(yield* answered(app.api.voyages.byId({ id: VoyageId.make("voyage-nowhere") }))).toBeNull();
});
