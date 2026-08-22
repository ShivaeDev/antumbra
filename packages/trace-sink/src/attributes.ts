// why: the four ids the trace is searched by get their own indexed columns, so
// "what happened to this Session" is one index seek rather than a JSON scan of
// every span in the run. Everything else stays in the attributes document.
export const INDEXED_IDENTIFIERS = [
	"sessionId",
	"agentId",
	"intentId",
	"pieceId",
] as const;

export type IndexedIdentifier = (typeof INDEXED_IDENTIFIERS)[number];

export type Identifiers = Readonly<Record<IndexedIdentifier, string | null>>;

const identifier = (
	attributes: ReadonlyMap<string, unknown>,
	key: IndexedIdentifier,
): string | null => {
	const value = attributes.get(key);
	return typeof value === "string" && value.length > 0 ? value : null;
};

export const identifiersOf = (
	attributes: ReadonlyMap<string, unknown>,
): Identifiers => ({
	agentId: identifier(attributes, "agentId"),
	intentId: identifier(attributes, "intentId"),
	pieceId: identifier(attributes, "pieceId"),
	sessionId: identifier(attributes, "sessionId"),
});

// why: a span attribute is whatever the annotating call passed, so the
// serializer answers for values JSON refuses — bigints and cycles — instead of
// failing a flush and taking the whole run's tail of spans down with it.
const replacer = (seen: WeakSet<object>) => {
	const replace = (_key: string, value: unknown): unknown => {
		if (typeof value === "bigint") {
			return value.toString();
		}
		if (typeof value !== "object" || value === null) {
			return value;
		}
		if (seen.has(value)) {
			return "[circular]";
		}
		seen.add(value);
		return value;
	};
	return replace;
};

export const serializeRecord = (
	record: Readonly<Record<string, unknown>>,
): string => JSON.stringify(record, replacer(new WeakSet()));

export const serializeAttributes = (
	attributes: ReadonlyMap<string, unknown>,
): string => serializeRecord(Object.fromEntries(attributes));
