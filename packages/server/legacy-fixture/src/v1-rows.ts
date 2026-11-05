import type { Fields } from "@antumbra/platform-feature/fields.ts";
import type { RowDefinition } from "@antumbra/platform-feature/row.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { codecFor } from "#v1/codec.ts";
import { decode } from "#v1/decode.ts";

export const legacyRows = <Name extends string, Of extends Fields, Key extends keyof Of & string, Scope extends (keyof Of & string) | undefined>(
	row: RowDefinition<Name, Of, Key, Scope>,
) =>
	Effect.gen(function* () {
		const source = yield* SqlClient.SqlClient;
		return yield* source`select * from ${source(row.name)} order by rowid`.pipe(
			Effect.flatMap((values) =>
				Effect.forEach(values, (value) =>
					codecFor(row)
						.decodeRow(value)
						.pipe(Effect.flatMap(Schema.decodeUnknownEffect(row.Row))),
				),
			),
		);
	});
export const legacyEvents = <S extends Schema.ConstraintCodec<unknown, unknown>>(schema: S, names: readonly string[]) =>
	Effect.gen(function* () {
		const entries = yield* decode(names);
		return yield* Effect.forEach(entries, (entry) =>
			Schema.decodeUnknownEffect(schema)({ ...entry.payload, at: entry.at, sequence: entry.seq, _tag: entry.name }).pipe(
				Effect.map((value) => ({ value, requestId: Request.make(entry.requestId) })),
			),
		);
	});
