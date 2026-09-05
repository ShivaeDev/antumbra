import { DatabaseSync } from "node:sqlite";
import { Effect } from "effect";
import { expect } from "vitest";
import { Database } from "#database.ts";
import { ensureInstallMarker } from "#install-marker.ts";
import { acquireTemporaryPersistence, it } from "#testing.ts";

const journalMode = (path: string): unknown => {
	const database = new DatabaseSync(path);
	const mode = database.prepare("PRAGMA journal_mode").get()?.journal_mode;
	database.close();
	return mode;
};

it.effect("applies WAL at layer connect", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.AppMeta.where({ key: "journal-probe" }).exists();
			expect(journalMode(temporary.database)).toBe("wal");
		}).pipe(Effect.provide(temporary.layer));
	}),
);

it.effectDB("stamps one install id and keeps returning it", function* () {
	const first = yield* ensureInstallMarker;
	const second = yield* ensureInstallMarker;

	expect(first).toMatch(/[0-9a-f-]{36}/);
	expect(second).toBe(first);
});

it.effectDB("decodes stored datetimes as UTC dates", function* (db) {
	const row = yield* db.AppMeta.create({ key: "datetime-probe", value: "x" });

	expect(row.updatedAt).toBeInstanceOf(Date);
});
