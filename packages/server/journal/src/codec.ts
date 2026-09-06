import type { RowShape } from "@antumbra/feature/row.ts";
import { Effect, Schema } from "effect";
import type { Row } from "effect/unstable/sql/SqlConnection";
import { type Column, columnsOf } from "#column.ts";

export interface RowCodec {
	readonly columns: readonly Column[];
	readonly decodeRow: (stored: Row) => Effect.Effect<unknown>;
	readonly encodeField: (name: string, value: unknown) => Effect.Effect<unknown>;
	readonly encodeRow: (value: unknown) => Effect.Effect<Record<string, unknown>>;
	readonly row: RowShape;
}

const toStorage = (kinds: ReadonlyMap<string, ColumnKindOf>, encoded: Record<string, unknown>): Record<string, unknown> =>
	Object.fromEntries(Object.entries(encoded).map(([name, value]) => [name, toColumn(kinds.get(name), value)]));

type ColumnKindOf = Column["kind"];

const toColumn = (kind: ColumnKindOf | undefined, value: unknown): unknown =>
	kind === "JSON" && value !== null && value !== undefined ? JSON.stringify(value) : value;

const fromColumn = (kind: ColumnKindOf | undefined, value: unknown): unknown =>
	kind === "JSON" && typeof value === "string" ? JSON.parse(value) : value;

const fromStorage = (kinds: ReadonlyMap<string, ColumnKindOf>, stored: Row): Record<string, unknown> =>
	Object.fromEntries(Object.entries(stored).map(([name, value]) => [name, fromColumn(kinds.get(name), value)]));

export const codecFor = (row: RowShape): RowCodec => {
	const columns = columnsOf(row);
	const kinds = new Map(columns.map((column) => [column.name, column.kind]));
	const decode = Schema.decodeUnknownEffect(row.Row);
	const encode = Schema.encodeUnknownEffect(row.Row);
	const fields = new Map(Object.entries(row.fields).map(([name, field]) => [name, Schema.encodeUnknownEffect(field)]));
	return {
		columns,
		decodeRow: (stored) =>
			Effect.orDie(
				Effect.flatMap(
					Effect.sync(() => fromStorage(kinds, stored)),
					decode,
				),
			),
		encodeField: (name, value) => {
			const field = fields.get(name);
			return field === undefined
				? Effect.die(new Error(`row "${row.name}" has no field "${name}"`))
				: Effect.orDie(Effect.map(field(value), (encoded) => toColumn(kinds.get(name), encoded)));
		},
		encodeRow: (value) => Effect.orDie(Effect.map(encode(value), (encoded) => toStorage(kinds, encoded))),
		row,
	};
};
