import { group } from "@antumbra/rpc/group.ts";
import { Token } from "@antumbra/rpc/token.ts";
import { describe, expect, it } from "vitest";
import { boards, notes } from "#test/example.ts";

const tags = (...features: Parameters<typeof group>[0]): readonly string[] => [...group(features).requests.keys()].toSorted();

describe("group", () => {
	it("merges the features into one group without a clash", () => {
		expect(tags(notes, boards)).toEqual(["boards.all", "notes.onBoard", "notes.write"]);
	});

	it("carries the token middleware on every rpc", () => {
		for (const rpc of group([notes, boards]).requests.values()) {
			expect([...rpc.middlewares]).toEqual([Token]);
		}
	});

	it("answers a command with the sequence number and a query with a stream", () => {
		const requests = group([notes]).requests;
		expect(requests.get("notes.write")?.successSchema.ast._tag).toBe("Number");
		expect(requests.get("notes.onBoard")?.successSchema.ast._tag).toBe("Declaration");
	});
});
