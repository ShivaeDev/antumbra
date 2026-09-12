import { RowNotFound } from "@antumbra/platform-feature/rejection.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { it } from "@effect/vitest";
import { Cause, Effect, Option, Schema } from "effect";
import { expect } from "vitest";
import { codecFor } from "#codec.ts";
import { Database } from "#database.ts";
import * as Journal from "#journal.ts";
import { readHandle } from "#read-handle.ts";
import { tableDdl } from "#table.ts";

const note = row("note", { id: Schema.String, text: Schema.String }, { key: "id" });

const stored = Effect.gen(function* () {
	const database = yield* Database;
	yield* Effect.orDie(database.write.unsafe(tableDdl(note)));
	yield* Effect.orDie(database.write`INSERT INTO "note" ("id", "text") VALUES ('one', 'hello')`);
	return readHandle(database.read, codecFor(note));
});

it.effect("find returns an option for present and missing rows", () =>
	Effect.gen(function* () {
		const rows = yield* stored;
		expect(yield* rows.find("one")).toEqual(Option.some({ id: "one", text: "hello" }));
		expect(yield* rows.find("missing")).toEqual(Option.none());
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("get defects when its required row is missing", () =>
	Effect.gen(function* () {
		const rows = yield* stored;
		const cause = yield* Effect.flip(Effect.sandbox(rows.get("missing")));
		expect(Cause.hasDies(cause)).toBe(true);
		expect(Cause.squash(cause)).toBeInstanceOf(RowNotFound);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("where and count match nullable fields", () =>
	Effect.gen(function* () {
		const session = row("session", { id: Schema.String, parentId: Schema.NullOr(Schema.String) }, { key: "id" });
		const database = yield* Database;
		yield* Effect.orDie(database.write.unsafe(tableDdl(session)));
		yield* Effect.orDie(database.write`INSERT INTO "session" ("id", "parentId") VALUES ('root', NULL), ('child', 'root')`);
		const rows = readHandle(database.read, codecFor(session));
		expect(yield* rows.where({ parentId: null })).toEqual([{ id: "root", parentId: null }]);
		expect(yield* rows.count({ parentId: null })).toBe(1);
		expect(yield* rows.where({ parentId: "root" })).toEqual([{ id: "child", parentId: "root" }]);
	}).pipe(Effect.provide(Journal.memory())),
);
