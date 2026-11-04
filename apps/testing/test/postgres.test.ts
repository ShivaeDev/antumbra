import { Effect } from "effect";
import { expect } from "vitest";
import { hasStoredEntry, postgres, postgresInstance } from "#test-support/postgres.ts";

postgresInstance.it("starts on a Unix socket and applies Antumbra migrations", [], function* ({ connection, migrations }) {
	expect(new URL(connection()).searchParams.get("host")).toMatch(/^\//);
	expect(yield* migrations()).toEqual([
		{ name: "storage_namespace" },
		{ name: "events" },
		{ name: "voyages" },
		{ name: "pieces" },
		{ name: "mail" },
		{ name: "settings" },
		{ name: "backends" },
		{ name: "role_settings" },
		{ name: "boards" },
		{ name: "repos" },
		{ name: "artifacts" },
		{ name: "reports" },
		{ name: "inputs" },
		{ name: "changes" },
		{ name: "sessions" },
		{ name: "agents" },
		{ name: "capacity" },
		{ name: "reclamation" },
		{ name: "rulings" },
		{ name: "lifecycle" },
		{ name: "supervision" },
		{ name: "execution" },
		{ name: "execution_contexts" },
	]);
});

postgresInstance.it("retains stored data after a restart", [hasStoredEntry("before restart")], function* ({ storedEntries, restart }) {
	expect(yield* storedEntries()).toEqual([{ value: "before restart" }]);

	yield* restart();

	expect(yield* storedEntries()).toEqual([{ value: "before restart" }]);
});

postgres.it("isolates committed databases from the next test database", [], function* ({ store, storedEntries, openFreshDatabase }) {
	expect(yield* storedEntries()).toEqual([]);

	yield* store("committed");

	expect(yield* storedEntries()).toEqual([{ value: "committed" }]);

	yield* openFreshDatabase();

	expect(yield* storedEntries()).toEqual([]);
});

postgres.it("rolls back writes before reading the same database", [], function* ({ store, storedEntries, rollback }) {
	yield* rollback(
		Effect.gen(function* () {
			yield* store("rolled back");

			expect(yield* storedEntries()).toEqual([{ value: "rolled back" }]);
		}),
	);

	expect(yield* storedEntries()).toEqual([]);
});

postgres.it("publishes changes after a commit", [], function* ({ transaction, storedEntries, published }) {
	expect(published()).toEqual([]);

	yield* transaction("committed", "commit");

	expect(yield* storedEntries()).toEqual([{ value: "committed" }]);

	expect(published()).toEqual(["committed"]);
});

postgres.it("discards changes with a rolled back write", [], function* ({ transaction, storedEntries, published }) {
	yield* transaction("rolled back", "rollback");

	expect(yield* storedEntries()).toEqual([]);
	expect(published()).toEqual([]);
});

postgres.it("advances application time with a controlled clock", [], function* ({ clock }) {
	const before = yield* clock.now();

	yield* clock.advance(60_000);

	expect(yield* clock.now()).toBe(before + 60_000);
});
