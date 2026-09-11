import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { it } from "@effect/vitest";
import { Cause, Effect, Schema } from "effect";
import { expect } from "vitest";
import { type AppDefinition, app, registryOf } from "#app.ts";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { pieces } from "#example/feature.ts";
import { PieceId, VoyageId } from "#example/ids.ts";
import { pieceParkedMaterializer } from "#example/materializers/piece-parked.ts";
import { piece } from "#example/rows/piece.ts";

const echoes = feature("echoes", { rows: [piece], facts: [pieceParked], commands: [], materializers: [pieceParkedMaterializer], queries: [] });

const pieceLanded = fact("PieceLanded", { pieceId: PieceId });

const pieceLandedMaterializer = materializer(pieceLanded, {
	writes: [piece],
	run: Effect.fn("landings.PieceLanded")(function* (fact, rows) {
		yield* rows.piece.update(fact.pieceId, { status: "landed" });
	}),
});

const landings = feature("landings", { rows: [piece], facts: [pieceLanded], commands: [], materializers: [pieceLandedMaterializer], queries: [] });

const narrowed = row("piece", { id: PieceId, voyageId: VoyageId, title: Schema.String }, { key: "id", scope: "voyageId" });

const reports = feature("reports", { rows: [narrowed], facts: [], commands: [], materializers: [], queries: [] });

const refusalOf = (definition: AppDefinition) =>
	Effect.map(Effect.flip(Effect.sandbox(registryOf(definition))), (cause) => String(Cause.squash(cause)));

it.effect("refuses two served features that declare the same fact", () =>
	Effect.gen(function* () {
		expect(yield* refusalOf(app([pieces, echoes]))).toBe('Error: features "pieces" and "echoes" both declare the fact "PieceParked"');
	}),
);

it.effect("refuses two served features that declare the same row with different shapes", () =>
	Effect.gen(function* () {
		expect(yield* refusalOf(app([pieces, reports]))).toBe('Error: features "pieces" and "reports" declare the row "piece" with different shapes');
	}),
);

it.effect("materializes each fact of every served feature and shares the row they both declare", () =>
	Effect.gen(function* () {
		const registry = yield* registryOf(app([pieces, landings]));
		expect([...registry.materializers.keys()]).toEqual(["PieceParked", "PieceLanded"]);
		expect(registry.rows).toEqual([piece]);
	}),
);
