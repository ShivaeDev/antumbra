import type { Effect, Option } from "effect";
import type { RowKey, RowShape, RowValue } from "#row.ts";

export interface ReadRows<Value, Key> {
	readonly find: (key: Key) => Effect.Effect<Option.Option<Value>>;
	readonly get: (key: Key) => Effect.Effect<Value>;
	readonly where: (match: Partial<Value>) => Effect.Effect<readonly Value[]>;
	readonly count: (match: Partial<Value>) => Effect.Effect<number>;
	readonly exists: (key: Key) => Effect.Effect<boolean>;
}

export interface WriteRows<Value, Key> extends ReadRows<Value, Key> {
	readonly insert: (value: Value) => Effect.Effect<void>;
	readonly update: (key: Key, patch: Partial<Value>) => Effect.Effect<void>;
	readonly delete: (key: Key) => Effect.Effect<void>;
}

export type ReadHandles<Rows extends readonly RowShape[]> = {
	readonly [Row in Rows[number] as Row["name"]]: ReadRows<RowValue<Row>, RowKey<Row>>;
};

export type WriteHandles<Rows extends readonly RowShape[]> = {
	readonly [Row in Rows[number] as Row["name"]]: WriteRows<RowValue<Row>, RowKey<Row>>;
};
