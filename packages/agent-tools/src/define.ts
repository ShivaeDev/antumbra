import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { Effect, JsonSchema, Schema } from "effect";

// why: a tool's arguments are an Effect schema and nothing else — the JSON
// Schema a harness needs is derived from it, so the shape the model is shown
// and the shape the handler receives can never drift apart.
export interface ToolSpec<Fields extends Schema.Struct.Fields> {
	readonly description: string;
	readonly input: Schema.Struct<Fields> & { readonly DecodingServices: never };
	readonly inputSchema: Record<string, unknown>;
	readonly name: string;
}

// why: Effect emits a fieldless struct as `anyOf(object, array)` — faithful to
// the type and useless to both harnesses, which require a plain object schema.
// A tool that takes no arguments says so directly.
const NO_ARGUMENTS: Record<string, unknown> = {
	additionalProperties: false,
	properties: {},
	required: [],
	type: "object",
};

const inputSchemaOf = <Fields extends Schema.Struct.Fields>(input: Schema.Struct<Fields>): Record<string, unknown> =>
	Object.keys(input.fields).length === 0
		? { ...NO_ARGUMENTS }
		: JsonSchema.toDocumentDraft07(Schema.toJsonSchemaDocument(input, { additionalProperties: false })).schema;

export const defineTool = <Fields extends Schema.Struct.Fields>(options: {
	readonly description: string;
	readonly input: Schema.Struct<Fields> & { readonly DecodingServices: never };
	readonly name: string;
}): ToolSpec<Fields> => ({
	description: options.description,
	input: options.input,
	inputSchema: inputSchemaOf(options.input),
	name: options.name,
});

// why: a harness sends no arguments object at all for a tool that takes none,
// and that is not a malformed call — it is the empty one.
const payloadOf = (args: unknown): unknown => args ?? {};

export const bind = <Fields extends Schema.Struct.Fields>(
	spec: ToolSpec<Fields>,
	handle: (input: Schema.Struct<Fields>["Type"]) => Effect.Effect<DirectToolOutcome>,
): DirectTool => {
	const decode = Schema.decodeUnknownEffect(spec.input);
	return {
		// why: arguments arrive from a model, so bad ones are ordinary traffic:
		// they come back as a refusal the model can read and retry, never as a
		// failure the session has to survive.
		call: (args) =>
			decode(payloadOf(args)).pipe(
				Effect.matchEffect({
					onFailure: (error) => Effect.succeed({ ok: false, text: `${spec.name}: ${error}` }),
					onSuccess: handle,
				}),
			),
		description: spec.description,
		inputSchema: spec.inputSchema,
		name: spec.name,
	};
};
