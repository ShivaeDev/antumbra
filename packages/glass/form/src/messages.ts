import { type SchemaAST, SchemaIssue, type StandardSchema } from "effect";

export type FieldMessages = Readonly<Record<string, string>>;

export const noMessages: FieldMessages = {};

const REQUIRED = "Required";

const MINIMUM_LENGTH = "effect/schema/isMinLength";

const refusesEmpty = (check: SchemaAST.Filter<unknown>): boolean => {
	const representation = check.annotations?.representation;
	if (representation === undefined || representation.id !== MINIMUM_LENGTH) {
		return false;
	}
	const payload = representation.payload;
	if (typeof payload !== "object" || payload === null || !("minLength" in payload)) {
		return false;
	}
	return payload.minLength === 1;
};

const checkHook: SchemaIssue.CheckHook = (issue) => SchemaIssue.defaultCheckHook(issue) ?? (refusesEmpty(issue.filter) ? REQUIRED : undefined);

const formatIssue = SchemaIssue.makeFormatterStandardSchemaV1({ checkHook });

const segmentKey = (segment: PropertyKey | StandardSchema.StandardSchemaV1.PathSegment): string =>
	typeof segment === "object" ? String(segment.key) : String(segment);

export const messagesByField = (issue: SchemaIssue.Issue): FieldMessages => {
	const messages: Record<string, string> = {};
	for (const entry of formatIssue(issue).issues) {
		const head = entry.path?.[0];
		if (head === undefined) {
			continue;
		}
		const name = segmentKey(head);
		if (!(name in messages)) {
			messages[name] = entry.message;
		}
	}
	return messages;
};

export const withoutField = (messages: FieldMessages, name: string): FieldMessages => {
	if (!(name in messages)) {
		return messages;
	}
	const next: Record<string, string> = {};
	for (const [key, message] of Object.entries(messages)) {
		if (key !== name) {
			next[key] = message;
		}
	}
	return next;
};

export const literalChoices = (ast: SchemaAST.AST): readonly SchemaAST.LiteralValue[] | undefined => {
	if (ast._tag !== "Union") {
		return undefined;
	}
	const choices: SchemaAST.LiteralValue[] = [];
	for (const member of ast.types) {
		if (member._tag !== "Literal") {
			return undefined;
		}
		choices.push(member.literal);
	}
	return choices;
};
