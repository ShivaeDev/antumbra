import { DatabaseSync } from "node:sqlite";
import { makeDatabaseIt } from "@shivaedev/effect-prisma/testing";
import { expect } from "vitest";
import { Database } from "#database.ts";
import { ensureInstallMarker } from "#install-marker.ts";
import { temporaryPersistence } from "#testing.ts";

const temporary = temporaryPersistence();

const it = makeDatabaseIt({
	database: Database,
	layer: temporary.layer,
});

it.afterAll(temporary.remove);

const journalMode = (path: string): unknown => {
	const database = new DatabaseSync(path);
	const mode = database.prepare("PRAGMA journal_mode").get()?.journal_mode;
	database.close();
	return mode;
};

it.effectDB("applies WAL at layer connect", function* (db) {
	yield* db.AppMeta.where({ key: "journal-probe" }).exists();

	expect(journalMode(temporary.database)).toBe("wal");
});

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

it.effectDB("rolls the previous test's writes back", function* (db) {
	expect(yield* db.AppMeta.where({ key: "datetime-probe" }).exists()).toBe(false);
});
