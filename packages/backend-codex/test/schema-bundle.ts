import { readFileSync } from "node:fs";
import { Schema } from "effect";

// why: app-server negotiates no protocol version, so the vendored schema files
// for the pinned CLI are the contract. Loading them is shared so every test
// that holds the slice to the pin reads the same bundle.
// Regenerate with `codex app-server generate-json-schema --out <dir>` when the
// pin moves, and let those tests say what changed.
const EnumNode = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
});
const Variant = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
	properties: Schema.optional(
		Schema.Struct({
			method: Schema.optional(EnumNode),
			thread_spawn: Schema.optional(Schema.Unknown),
			type: Schema.optional(EnumNode),
		}),
	),
	title: Schema.optional(Schema.String),
});
const Definition = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
	oneOf: Schema.optional(Schema.Array(Variant)),
	properties: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
	required: Schema.optional(Schema.Array(Schema.String)),
});
const SchemaFile = Schema.Struct({
	definitions: Schema.Record(Schema.String, Definition),
	oneOf: Schema.optional(Schema.Array(Variant)),
});
export type SchemaFile = typeof SchemaFile.Type;
const decodeSchemaFile = Schema.decodeUnknownSync(
	Schema.fromJsonString(SchemaFile),
);
const ResponseFile = Schema.Struct({
	required: Schema.Array(Schema.String),
});
const decodeResponseFile = Schema.decodeUnknownSync(
	Schema.fromJsonString(ResponseFile),
);
const read = (name: string): string =>
	readFileSync(new URL(`../src/schema/${name}`, import.meta.url), "utf8");

const load = (name: string): SchemaFile => decodeSchemaFile(read(name));
const loadResponse = (name: string): typeof ResponseFile.Type =>
	decodeResponseFile(read(name));

export const bundle = load("codex_app_server_protocol.v2.schemas.json");
export const serverRequests = load("ServerRequest.json");
export const serverNotifications = load("ServerNotification.json");
export const toolCallResponse = loadResponse("DynamicToolCallResponse.json");
export const currentTimeResponse = loadResponse("CurrentTimeReadResponse.json");

export const methodsOf = (file: SchemaFile): ReadonlyArray<string> =>
	(file.oneOf ?? []).flatMap((variant) => {
		const values = variant.properties?.method?.enum;
		return values ?? [];
	});

export const enumOf = (name: string): ReadonlyArray<string> => {
	const definition = bundle.definitions[name];
	const values = definition?.enum;
	return values ?? [];
};

export const literalsOf = (schema: {
	readonly ast: unknown;
}): ReadonlyArray<string> =>
	JSON.stringify(schema.ast)
		.match(/"literal":"([^"]+)"/g)
		?.map((hit) => hit.slice('"literal":"'.length, -1)) ?? [];

export const variantTypes = (name: string): ReadonlyArray<string> => {
	const definition = bundle.definitions[name];
	const variants = definition?.oneOf;
	if (!Array.isArray(variants)) {
		return [];
	}
	return variants.flatMap((variant) => variant.properties?.type?.enum ?? []);
};
