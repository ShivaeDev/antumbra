import { row } from "@antumbra/feature";
import { it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { expect } from "vitest";
import type { Registry } from "#app.ts";
import { Database } from "#database.ts";
import { TableShapeChanged } from "#errors.ts";
import { PieceId, VoyageId } from "#example/ids.ts";
import { piece } from "#example/rows/piece.ts";
import * as Journal from "#journal.ts";
import { start } from "#startup.ts";
import { indexDdl, shapeOf, tableDdl } from "#table.ts";

const narrowed = row("piece", { id: PieceId, voyageId: VoyageId, title: Schema.String }, { key: "id", scope: "voyageId" });

const registryFor = (rows: Registry["rows"]): Registry => ({ codecs: new Map(), materializers: new Map(), rows });

it("derives the projection table and its scope index from the row's schema", () => {
	expect(tableDdl(piece)).toBe(
		'CREATE TABLE "piece" ("id" TEXT NOT NULL PRIMARY KEY, "voyageId" TEXT NOT NULL, "title" TEXT NOT NULL, "status" TEXT NOT NULL, "parkedReason" TEXT)',
	);
	expect(indexDdl(piece)).toBe('CREATE INDEX "piece_by_voyageId" ON "piece" ("voyageId")');
	expect(shapeOf(piece)).not.toBe(shapeOf(narrowed));
});

it.effect("startup refuses a projection table that was built for another shape", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* start(database.write, registryFor([piece]));
		const failure = yield* Effect.flip(start(database.write, registryFor([narrowed])));
		expect(failure).toBeInstanceOf(TableShapeChanged);
		expect(failure.table).toBe("piece");
		expect(failure.expected).toBe(shapeOf(narrowed));
		expect(failure.stored).toBe(shapeOf(piece));
	}).pipe(Effect.provide(Journal.memory())),
);
