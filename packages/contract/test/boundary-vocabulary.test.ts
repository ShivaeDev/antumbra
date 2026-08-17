import { expect, it } from "@effect/vitest";
import { Schema } from "effect";
import {
	BoardEntryView,
	BoardWriteRequest,
	SessionEvent,
	TRPC_FAILURE_CODES,
	TrpcFailureCode,
	TrpcRequest,
} from "#index.ts";

it("rejects an arbitrary Board register at the public boundary", () => {
	const decoded = Schema.decodeUnknownOption(BoardEntryView)({
		authorAgentId: null,
		body: "one shared vocabulary",
		createdAt: "2026-08-17T00:00:00.000Z",
		id: "entry-1",
		register: "future-register",
	});
	expect(decoded._tag).toBe("None");
	expect(
		Schema.decodeUnknownOption(BoardWriteRequest)({
			body: "one shared vocabulary",
			register: "future-register",
			scope: { kind: "voyage", voyageId: "voyage-1" },
		})._tag,
	).toBe("None");
});

it("rejects arbitrary operation kinds at the invoke boundary", () => {
	const decode = Schema.decodeUnknownOption(TrpcRequest);
	const decoded = decode({
		input: undefined,
		path: "fleet",
		type: "subscription",
	});
	expect(decoded._tag).toBe("None");
	for (const type of ["query", "mutation"] as const) {
		expect(decode({ input: undefined, path: "fleet", type })._tag).toBe("Some");
	}
});

it("accepts every pinned tRPC failure code and no arbitrary word", () => {
	const decode = Schema.decodeUnknownOption(TrpcFailureCode);
	for (const code of TRPC_FAILURE_CODES) {
		expect(decode(code)._tag, code).toBe("Some");
	}
	expect(decode("FUTURE_FAILURE")._tag).toBe("None");
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
