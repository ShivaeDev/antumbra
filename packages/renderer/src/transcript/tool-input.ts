import { Option, Schema } from "effect";

const decodeInput = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)));

export interface ToolField {
	readonly name: string;
	readonly text: string;
}

// why: JSON is written for a machine — read as it arrives, a command spells
// its newlines \n and doubles every quote in it. A string field is handed back
// as the text it was before it was encoded; anything else keeps its shape.
const asText = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value, undefined, 2));

const fromRecord = (input: Record<string, unknown>): ReadonlyArray<ToolField> =>
	Object.entries(input).map(([name, value]) => ({
		name,
		text: asText(value),
	}));

// why: an input that is not a record of arguments is already the text it is,
// so it is shown as it arrived rather than under a field name it never had.
export const toolFields = (input: string): ReadonlyArray<ToolField> =>
	Option.match(decodeInput(input), {
		onNone: () => [],
		onSome: fromRecord,
	});
