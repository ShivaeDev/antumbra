import { createHash } from "node:crypto";
import type { SessionInputDraftPart } from "#model.ts";

const field = (hash: ReturnType<typeof createHash>, value: string): void => {
	const bytes = new TextEncoder().encode(value);
	hash.update(`${bytes.length}:`);
	hash.update(bytes);
};

export const digestBytes = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

export const digestRequest = (sessionId: string, parts: ReadonlyArray<SessionInputDraftPart>): string => {
	const hash = createHash("sha256");
	field(hash, sessionId);
	for (const part of parts) {
		field(hash, part.type);
		if (part.type === "text") {
			field(hash, part.text);
			continue;
		}
		field(hash, part.name);
		field(hash, part.declaredMediaType ?? "");
		field(hash, String(part.bytes.length));
		hash.update(part.bytes);
	}
	return hash.digest("hex");
};
