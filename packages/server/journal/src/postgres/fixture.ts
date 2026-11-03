import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { Effect } from "effect";
import { layer as reactivityLayer } from "effect/reactivity/Reactivity";
import { postgresTests } from "#postgres/testing.ts";
import { journalVoyages, replayVoyageFixture } from "#postgres/voyages/fixture.ts";
import { VoyageHistory } from "#postgres/voyages/service.ts";

export const checkPostgresFixture = Effect.fn("Postgres.checkFixture")(
	function* (filename: string) {
		const snapshot = yield* journalVoyages(filename);
		return yield* replayVoyageFixture(snapshot).pipe(Effect.provide(VoyageHistory.layer), withIsolatedDatabase, Effect.provide(postgresTests));
	},
	Effect.provide(reactivityLayer),
	Effect.scoped,
);
