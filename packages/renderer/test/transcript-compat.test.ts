import type { SessionEvent } from "@antumbra/contract";
import { expect, it } from "vitest";
import { deriveTranscript } from "#transcript/derive.ts";

it("renders a mismatched historical envelope from its exact stored evidence", () => {
	const raw = { kind: "wire/kind", payload: "{}", source: "scripted" };
	const payload = JSON.stringify({
		raw,
		role: "agent",
		text: "the payload disagrees with its durable kind",
		type: "message",
	});
	const row: SessionEvent = {
		event: { _tag: "Unknown", kind: "thinking", payload },
		seq: 9,
		sessionId: "session-1",
	};
	expect(deriveTranscript([row])).toEqual([{ kind: "raw", label: "thinking", payload, seq: 9 }]);
});
