import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { layer as reactivityLayer } from "effect/reactivity/Reactivity";
import { type AppDefinition, registryOf } from "#app.ts";

export class FixtureFactInvalid extends Schema.TaggedError<FixtureFactInvalid>()("FixtureFactInvalid", { name: Schema.String, seq: Schema.Number }) {}

export const validateFixture = Effect.fn("Fixture.validateFacts")(function* (filename: string, definition: AppDefinition) {
	const registry = yield* registryOf(definition);
	const sql = yield* SqliteClient.make({ filename, readonly: true });
	const entries = yield* sql`select seq, name, payload from journal order by seq`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ seq: Schema.Number, name: Schema.String, payload: Schema.String })))),
	);
	for (const entry of entries) {
		const declared = registry.materializers.get(entry.name);
		if (declared === undefined) return yield* Effect.fail(new FixtureFactInvalid(entry));
		yield* Schema.decodeUnknownEffect(Schema.fromJsonString(declared.fact.Payload))(entry.payload).pipe(
			Effect.mapError(() => new FixtureFactInvalid(entry)),
		);
	}
}, Effect.provide(reactivityLayer));
