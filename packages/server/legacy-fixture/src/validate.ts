import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { decode } from "#v1/decode.ts";

export const validateFixture = Effect.fn("LegacyV1.validateFixture")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
	yield* decode().pipe(Effect.provideService(SqlClient.SqlClient, source));
});
