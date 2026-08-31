import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { Effect, JsonSchema, Schema } from "effect";

interface ToolSpec<Fields extends Schema.Struct.Fields> {
	readonly description: string;
	readonly input: Schema.Struct<Fields> & { readonly DecodingServices: never };
	readonly inputSchema: Record<string, unknown>;
	readonly name: string;
}

// Effect emits a fieldless Struct as anyOf(object, array), while both harnesses require a plain object schema.
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

export const bind = <Fields extends Schema.Struct.Fields>(
	spec: ToolSpec<Fields>,
	handle: (input: Schema.Struct<Fields>["Type"]) => Effect.Effect<DirectToolOutcome>,
): DirectTool => {
	const decode = Schema.decodeUnknownEffect(spec.input);
	const call = Effect.fn(`agentTools.${spec.name}`)((args: unknown) =>
		Effect.matchEffect(decode(args ?? {}), {
			onFailure: (error) => Effect.succeed({ ok: false, text: `${spec.name}: ${error}` }),
			onSuccess: handle,
		}),
	);
	return {
		call,
		description: spec.description,
		inputSchema: spec.inputSchema,
		name: spec.name,
	};
};
