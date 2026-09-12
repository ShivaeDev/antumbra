import { Option, Schema } from "effect";

const decodeInput = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)));

export interface ToolField {
	readonly name: string;
	readonly text: string;
}

const asText = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value, undefined, 2));

const fromRecord = (input: Record<string, unknown>): ReadonlyArray<ToolField> =>
	Object.entries(input).map(([name, value]) => ({
		name,
		text: asText(value),
	}));

export const toolFields = (input: string): ReadonlyArray<ToolField> =>
	Option.match(decodeInput(input), {
		onNone: () => [],
		onSome: fromRecord,
	});
