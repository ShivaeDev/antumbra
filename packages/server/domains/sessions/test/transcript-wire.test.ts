import { Schema } from "effect";
import { expect, test } from "vitest";
import { TranscriptReading } from "#queries/transcript-rpc.ts";

test("transcript snapshots survive omitted optional JSON fields", () => {
	const reading = {
		items: [{ kind: "message" as const, role: "agent" as const, seq: 1, text: "hello", parts: [], inputId: undefined }],
		standing: { background: [], open: [], state: undefined, usage: undefined },
		activity: { live: false, words: undefined },
		unavailable: [],
	};
	const json = JSON.stringify(Schema.encodeSync(TranscriptReading)(reading));
	expect(Schema.decodeUnknownSync(TranscriptReading)(JSON.parse(json))).toMatchObject({
		items: [{ kind: "message", text: "hello" }],
		activity: { live: false },
	});
});
