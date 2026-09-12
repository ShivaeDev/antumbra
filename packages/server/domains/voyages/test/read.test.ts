import { answered, it } from "@antumbra/app-testing/entry.ts";
import { TestClock } from "effect/testing";
import { expect } from "vitest";
import { VoyageId } from "#ids.ts";
import { opening } from "#test/kit.ts";

it.app("lists oldest first and reads by id", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* TestClock.adjust("1 minute");
	yield* app.api.voyages.open({ ...opening, name: "Sound the shallows" });

	const listed = yield* answered(app.api.voyages.list({}));
	expect(listed.map((row) => row.name)).toEqual(["Flagship", "Chart the reef", "Sound the shallows"]);

	const reef = listed[1];
	expect(yield* answered(app.api.voyages.byId({ id: VoyageId.make(reef?.id ?? "") }))).toMatchObject({ name: "Chart the reef" });
	expect(yield* answered(app.api.voyages.byId({ id: VoyageId.make("voyage-nowhere") }))).toBeNull();
});
