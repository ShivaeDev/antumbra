import { replayPostgresFixture } from "@antumbra/legacy-fixture/replay.ts";
import { LegacyModel, legacyModel } from "@antumbra/legacy-fixture/v1/model.ts";
import { definition } from "@antumbra/server/definition.ts";
import { legacySource } from "@antumbra/server/fixture/source.ts";
import { postgresDefinition } from "@antumbra/server/postgres-definition.ts";
import { histories } from "@antumbra/server/services.ts";
import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { Effect, Layer } from "effect";
import { layer as reactivityLayer } from "effect/reactivity/Reactivity";
import { postgresTests } from "#postgres-testing.ts";

export const checkPostgresFixture = Effect.fn("Fixture.checkPostgres")((filename: string) =>
	replayPostgresFixture(filename).pipe(
		Effect.provide(histories),
		Effect.provide(legacySource),
		Effect.provideService(LegacyModel, legacyModel(definition)),
		withIsolatedDatabase,
		Effect.provide(postgresTests.pipe(Layer.provideMerge(postgresDefinition))),
		Effect.provide(reactivityLayer),
		Effect.scoped,
	),
);
