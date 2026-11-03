import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { Effect, Layer } from "effect";
import { layer as reactivityLayer } from "effect/reactivity/Reactivity";
import { journalPieces, replayPieceFixture } from "#postgres/pieces/fixture.ts";
import { PieceHistory } from "#postgres/pieces/service.ts";
import { postgresTests } from "#postgres/testing.ts";
import { journalVoyages, replayVoyageFixture } from "#postgres/voyages/fixture.ts";
import { VoyageHistory } from "#postgres/voyages/service.ts";

export const checkPostgresFixture = Effect.fn("Postgres.checkFixture")(
	function* (filename: string) {
		const snapshot = yield* journalVoyages(filename);
		const pieces = yield* journalPieces(filename);
		return yield* Effect.gen(function* () {
			const voyages = yield* replayVoyageFixture(snapshot);
			const replayed = yield* replayPieceFixture(pieces);
			return { ...voyages, ...replayed, events: voyages.events + replayed.events };
		}).pipe(Effect.provide(Layer.merge(VoyageHistory.layer, PieceHistory.layer)), withIsolatedDatabase, Effect.provide(postgresTests));
	},
	Effect.provide(reactivityLayer),
	Effect.scoped,
);
