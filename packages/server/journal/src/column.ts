import type { RowShape } from "@antumbra/feature/row.ts";
import { SchemaAST } from "effect";

export type ColumnKind = "INTEGER" | "JSON" | "REAL" | "TEXT";

export interface Column {
	readonly kind: ColumnKind;
	readonly name: string;
	readonly nullable: boolean;
}

const INTEGER_CHECK = "effect/schema/isInt";

const isInteger = (checks: ReadonlyArray<SchemaAST.Check<never>> | undefined): boolean =>
	checks?.some((check) => check.annotations?.representation?.id === INTEGER_CHECK || (check._tag === "FilterGroup" && isInteger(check.checks))) ===
	true;

const isText = (ast: SchemaAST.AST): boolean =>
	ast._tag === "String" || ast._tag === "TemplateLiteral" || (ast._tag === "Literal" && typeof ast.literal === "string");

const alternatives = (ast: SchemaAST.AST): readonly SchemaAST.AST[] => (ast._tag === "Union" ? ast.types : [ast]);

const kindOf = (types: readonly SchemaAST.AST[]): ColumnKind => {
	const only = types.length === 1 ? types[0] : undefined;
	if (only !== undefined && only._tag === "Number") {
		return isInteger(only.checks) ? "INTEGER" : "REAL";
	}
	return types.length > 0 && types.every(isText) ? "TEXT" : "JSON";
};

const columnOf = (name: string, ast: SchemaAST.AST): Column => {
	const all = alternatives(ast);
	const present = all.filter((member) => member._tag !== "Null" && member._tag !== "Undefined");
	return { kind: kindOf(present), name, nullable: present.length < all.length };
};

export const columnsOf = (row: RowShape): readonly Column[] =>
	Object.entries(row.fields).map(([name, field]) => columnOf(name, SchemaAST.toEncoded(field.ast)));
