import type { ToolDescriptor } from "@antumbra/platform-runner/tools.ts";
import type { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Effect, JsonSchema, Schema } from "effect";
import type { ToolContext } from "#context.ts";

export interface ToolSpec<Fields extends Schema.Struct.Fields> extends ToolDescriptor {
	readonly input: Schema.Struct<Fields> & { readonly DecodingServices: never };
}

export interface ToolHandler<Requirements = never> {
	readonly spec: ToolDescriptor;
	readonly invoke: (context: ToolContext, input: unknown) => Effect.Effect<ToolAnswer, never, Requirements>;
}

// A fieldless Struct otherwise generates anyOf(object, array), which provider tool APIs reject.
const NO_ARGUMENTS: Record<string, unknown> = { additionalProperties: false, properties: {}, required: [], type: "object" };

const inputSchemaOf = <Fields extends Schema.Struct.Fields>(input: Schema.Struct<Fields>): Record<string, unknown> =>
	Object.keys(input.fields).length === 0
		? { ...NO_ARGUMENTS }
		: JsonSchema.toDocumentDraft07(Schema.toJsonSchemaDocument(input, { additionalProperties: false })).schema;

export const defineTool = <Fields extends Schema.Struct.Fields>(options: {
	readonly description: string;
	readonly input: Schema.Struct<Fields> & { readonly DecodingServices: never };
	readonly name: string;
}): ToolSpec<Fields> => ({ ...options, inputSchema: inputSchemaOf(options.input) });

export const bind = <Fields extends Schema.Struct.Fields, Requirements>(
	spec: ToolSpec<Fields>,
	handle: (context: ToolContext, input: Schema.Struct<Fields>["Type"]) => Effect.Effect<ToolAnswer, never, Requirements>,
): ToolHandler<Requirements> => ({
	spec: { name: spec.name, description: spec.description, inputSchema: spec.inputSchema },
	invoke: (context, input) =>
		Effect.matchEffect(Schema.decodeUnknownEffect(spec.input)(input ?? {}), {
			onFailure: (error) => Effect.succeed({ ok: false, text: `${spec.name}: ${error}` }),
			onSuccess: (decoded) => handle(context, decoded),
		}),
});
