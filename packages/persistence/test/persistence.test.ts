import { DatabaseSync } from "node:sqlite";
import { makeDatabaseIt } from "@shivaedev/effect-prisma/testing";
import { Effect, Ref } from "effect";
import { expect } from "vitest";
import { appMeta, Database } from "../src/database.js";
import { ensureInstallMarker } from "../src/install-marker.js";
import { temporaryPersistence } from "../src/testing.js";
import { Writer } from "../src/writer.js";

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
	const meta = yield* appMeta(db);
	yield* meta.where({ key: "journal-probe" }).exists();

	expect(journalMode(temporary.database)).toBe("wal");
});

it.effectDB("stamps one install id and keeps returning it", function* () {
	const first = yield* ensureInstallMarker;
	const second = yield* ensureInstallMarker;

	expect(first).toMatch(/[0-9a-f-]{36}/);
	expect(second).toBe(first);
});

it.effectDB("decodes stored datetimes as UTC dates", function* (db) {
	const meta = yield* appMeta(db);
	const row = yield* meta.create({ key: "datetime-probe", value: "x" });

	expect(row.updatedAt).toBeInstanceOf(Date);
});

it.effectDB("rolls the previous test's writes back", function* (db) {
	const meta = yield* appMeta(db);

	expect(yield* meta.where({ key: "datetime-probe" }).exists()).toBe(false);
});

it.effectDB("serializes concurrent writes behind one permit", function* () {
	const writer = yield* Writer;
	const active = yield* Ref.make(0);
	const peak = yield* Ref.make(0);

	const job = writer.write(
		Effect.gen(function* () {
			const running = yield* Ref.updateAndGet(active, (n) => n + 1);
			yield* Ref.update(peak, (p) => Math.max(p, running));
			yield* Effect.yieldNow;
			yield* Ref.update(active, (n) => n - 1);
		}),
	);

	yield* Effect.all([job, job, job], { concurrency: "unbounded" });

	expect(yield* Ref.get(peak)).toBe(1);
});
