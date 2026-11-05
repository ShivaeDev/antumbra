import { fixtureApp, hasLegacyArchive } from "@antumbra/app-testing/fixture.ts";
import { opening, reef } from "@antumbra/app-testing/postgres-fixtures.ts";
import { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { expect } from "vitest";

fixtureApp.it("performs and preserves new work after replaying a captured journal into SQL", [hasLegacyArchive], function* (fixture) {
	expect(yield* fixture.voyages()).toEqual(
		expect.arrayContaining([expect.objectContaining({ id: VoyageId.make("legacy-chart"), name: "Legacy chart" })]),
	);
	expect(yield* fixture.board(VoyageId.make("legacy-chart"))).toEqual(
		expect.arrayContaining([expect.objectContaining({ body: "The old chart records a shoal" })]),
	);
	yield* fixture.openVoyage(opening);
	yield* fixture.note(reef, "A new sounding after replay");
	expect(yield* fixture.board(reef)).toEqual(expect.arrayContaining([expect.objectContaining({ body: "A new sounding after replay" })]));
	yield* fixture.restart;
	expect(yield* fixture.voyages()).toEqual(expect.arrayContaining([expect.objectContaining({ id: reef, name: opening.name })]));
	expect(yield* fixture.board(reef)).toEqual(expect.arrayContaining([expect.objectContaining({ body: "A new sounding after replay" })]));
});
