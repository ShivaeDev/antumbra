import type { Contract, FieldInputTypes } from "#contract.d.ts";

type Namespace = "__unbound__";
type Models = Contract["domain"]["namespaces"][Namespace]["models"];
type Tables = Contract["storage"]["namespaces"][Namespace]["entries"]["table"];
type Written = keyof Models & keyof FieldInputTypes[Namespace];

type FieldsOf<Model extends Written> = FieldInputTypes[Namespace][Model];
type StorageOf<Model extends Written> = Models[Model]["storage"];
type ColumnsOf<Model extends Written> = StorageOf<Model>["table"] extends infer Table extends keyof Tables ? Tables[Table]["columns"] : never;
type ColumnOf<Model extends Written, Field extends keyof FieldsOf<Model>> = Field extends keyof StorageOf<Model>["fields"]
	? StorageOf<Model>["fields"][Field] extends {
			readonly column: infer Column extends keyof ColumnsOf<Model>;
		}
		? ColumnsOf<Model>[Column]
		: never
	: never;

type Suppliable<Column> = Column extends { readonly default: unknown } ? true : Column extends { readonly nullable: true } ? true : false;

type Mandatory<Model extends Written> = {
	[Field in keyof FieldsOf<Model>]-?: Suppliable<ColumnOf<Model, Field>> extends true ? never : Field;
}[keyof FieldsOf<Model>];

// why: the generated create input keeps a second overload for nested writes, in
// which a foreign-key column may be omitted because the parent write supplies
// it. A top-level create falls through to that overload, so a NOT NULL column
// without a default can go missing without a compile error — and did, until a
// spawn failed at runtime. This shape asks the contract the same question the
// database asks: a column the database cannot fill on its own is mandatory.
export type NewRow<Model extends Written> = {
	[Field in Mandatory<Model>]: FieldsOf<Model>[Field];
} & {
	[Field in Exclude<keyof FieldsOf<Model>, Mandatory<Model>>]?: FieldsOf<Model>[Field];
};

export type NewAgentSession = NewRow<"AgentSession">;
