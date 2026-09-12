import { admiralWords } from "@antumbra/platform-prompts/admiral.ts";
import type { Input } from "@antumbra/platform-runner/input.ts";
import type { Prepared } from "#schema.ts";

export const runnerInput = (stored: Prepared): Input => {
	const part = (value: Prepared["parts"][number], position: number): Input["parts"][number] =>
		value.type === "text"
			? { type: "text", text: admiralWords({ words: value.text }) }
			: { type: "image", attachmentId: value.attachment.id, digest: value.attachment.digest, mediaType: value.attachment.mediaType, position };
	return { id: stored.id, parts: [part(stored.parts[0], 0), ...stored.parts.slice(1).map((value, index) => part(value, index + 1))] };
};
