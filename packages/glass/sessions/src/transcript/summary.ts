import { Option, Schema } from "effect";

const decodeInput = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)));

const CLIP = 90;

const clip = (text: string): string => (text.length > CLIP ? `${text.slice(0, CLIP - 1)}…` : text);

const shortPath = (path: string): string => {
	const parts = path.split("/").filter((part) => part !== "");
	const tail = parts.slice(-2).join("/");
	return clip(parts.length > 2 ? `…/${tail}` : tail);
};

const looksLikePath = (text: string): boolean => text.includes("/") && !text.includes("://") && !/\s/.test(text);

const oneLine = (text: string): string => {
	const lines = text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "");
	const [head] = lines;
	if (head === undefined) {
		return "";
	}
	const first = looksLikePath(head) ? shortPath(head) : clip(head);
	return lines.length > 1 ? `${first} +${lines.length - 1}` : first;
};

const scalar = (value: unknown): string | undefined => {
	if (typeof value === "string") {
		return value === "" ? undefined : value;
	}
	return typeof value === "number" || typeof value === "boolean" ? String(value) : undefined;
};

const TEXT_KEYS = ["description", "pattern", "query", "url", "command", "prompt", "title", "name"];

const PATH_KEYS = ["file_path", "notebook_path", "filePath", "path"];

const pick = (input: Record<string, unknown>, keys: ReadonlyArray<string>): string | undefined => {
	for (const key of keys) {
		const value = scalar(input[key]);
		if (value !== undefined) {
			return value;
		}
	}
	return undefined;
};

const anyScalar = (input: Record<string, unknown>): string | undefined => {
	for (const value of Object.values(input)) {
		const found = scalar(value);
		if (found !== undefined) {
			return found;
		}
	}
	return undefined;
};

const fromRecord = (input: Record<string, unknown>): string => {
	const text = pick(input, TEXT_KEYS);
	if (text !== undefined) {
		return oneLine(text);
	}
	const path = pick(input, PATH_KEYS);
	return path === undefined ? oneLine(anyScalar(input) ?? "") : shortPath(path);
};

export const summaryLine = (input: string): string =>
	Option.match(decodeInput(input), {
		onNone: () => oneLine(input),
		onSome: fromRecord,
	});
