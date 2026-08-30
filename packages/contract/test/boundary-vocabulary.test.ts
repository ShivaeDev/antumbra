import { expect, it } from "@effect/vitest";
import { Option, Schema } from "effect";
import { SessionEvent, VoyageCaptainView } from "#index.ts";

it("carries the captain's at-work judgment, never the status alone", () => {
	const decode = Schema.decodeUnknownOption(VoyageCaptainView);
	const stoodDown = decode({
		agentId: "agent-1",
		atWork: false,
		sessionId: "session-1",
		status: "alive",
	});
	expect(Option.getOrNull(stoodDown)?.atWork).toBe(false);
	expect(Option.getOrNull(stoodDown)?.sessionId).toBe("session-1");
	expect(decode({ agentId: "agent-1", status: "alive" })._tag).toBe("None");
});

it("exposes the shared known-or-unknown historical event envelope", () => {
	const decode = Schema.decodeUnknownSync(SessionEvent);
	const unknown = {
		event: { _tag: "Unknown", kind: "future.event", payload: "exact bytes" },
		seq: 4,
		sessionId: "session-1",
	};
	expect(decode(unknown)).toEqual(unknown);
	const known = {
		event: {
			_tag: "Known",
			event: {
				raw: { kind: "provider/raw", payload: "{}", source: "scripted" },
				type: "raw",
			},
		},
		seq: 5,
		sessionId: "session-1",
	};
	expect(decode(known)).toEqual(known);
});
