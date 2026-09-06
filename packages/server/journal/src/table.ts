import type { RowShape } from "@antumbra/journal";
import { Hash } from "effect";
import { type Column, columnsOf } from "#column.ts";

const storage = (column: Column): string => (column.kind === "JSON" ? "TEXT" : column.kind);

const declaration = (row: RowShape, column: Column): string =>
	`"${column.name}" ${storage(column)}${column.nullable ? "" : " NOT NULL"}${column.name === row.key ? " PRIMARY KEY" : ""}`;

export const tableDdl = (row: RowShape): string =>
	`CREATE TABLE "${row.name}" (${columnsOf(row)
		.map((column) => declaration(row, column))
		.join(", ")})`;

export const indexDdl = (row: RowShape): string | undefined =>
	row.scope === undefined ? undefined : `CREATE INDEX "${row.name}_by_${row.scope}" ON "${row.name}" ("${row.scope}")`;

export const shapeOf = (row: RowShape): string => Hash.string([tableDdl(row), indexDdl(row) ?? ""].join("; ")).toString(36);
