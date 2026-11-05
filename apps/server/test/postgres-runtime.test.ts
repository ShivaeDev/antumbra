import { opening, reef } from "@antumbra/app-testing/postgres-fixtures.ts";
import { runtimeApp } from "@antumbra/app-testing/runtime.ts";
import { Effect } from "effect";
import { expect } from "vitest";

runtimeApp.it("keeps a new Voyage after the server restarts", [], function* ({ openVoyage, voyages, restart }) {
	yield* openVoyage(opening);
	expect(yield* voyages()).toEqual(expect.arrayContaining([expect.objectContaining({ id: reef, name: opening.name })]));
	yield* restart;
	expect(yield* voyages()).toEqual(expect.arrayContaining([expect.objectContaining({ id: reef, name: opening.name })]));
});

runtimeApp.it("fails startup with a readable typed error when PostgreSQL binaries are missing", [], function* ({ startWithoutBinaries }) {
	const error = yield* Effect.flip(startWithoutBinaries);
	expect(error).toMatchObject({ _tag: "PostgresCommandError" });
	expect(String(error)).toContain("missing-binaries");
});

runtimeApp.it(
	"fails startup before migrations when configured binaries cannot open the application's data",
	[],
	function* ({ startWithMismatchedBinaries }) {
		const error = yield* Effect.flip(startWithMismatchedBinaries);
		expect(error).toMatchObject({ _tag: "AppPostgresVersionMismatch", expectedMajor: "1" });
		expect(String(error)).toContain("cannot open");
		expect(String(error)).toContain("data belongs to PostgreSQL");
	},
);
