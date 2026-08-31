// why: the four ids the trace is searched by get their own indexed columns, so
// "what happened to this Session" is one index seek rather than a JSON scan of
// every span in the run. Everything else stays in the attributes document.
const INDEXED_IDENTIFIERS = ["sessionId", "agentId", "intentId", "pieceId"] as const;

export type IndexedIdentifier = (typeof INDEXED_IDENTIFIERS)[number];

export type Identifiers = Readonly<Record<IndexedIdentifier, string | null>>;

const identifier = (attributes: ReadonlyMap<string, unknown>, key: IndexedIdentifier): string | null => {
	const value = attributes.get(key);
	return typeof value === "string" && value.length > 0 ? value : null;
};

export const identifiersOf = (attributes: ReadonlyMap<string, unknown>): Identifiers => ({
	agentId: identifier(attributes, "agentId"),
	intentId: identifier(attributes, "intentId"),
	pieceId: identifier(attributes, "pieceId"),
	sessionId: identifier(attributes, "sessionId"),
});

export const serialize = (value: unknown): string | undefined =>
	JSON.stringify(value, (_key, nested: unknown) => (typeof nested === "bigint" ? nested.toString() : nested));

export const serializeRecord = (record: Readonly<Record<string, unknown>>): string => serialize(record) ?? "{}";

export const serializeAttributes = (attributes: ReadonlyMap<string, unknown>): string => serializeRecord(Object.fromEntries(attributes));
