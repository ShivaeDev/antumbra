import { assemble, group } from "@antumbra/platform-rpc/group.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { describe, expect, it } from "vitest";
import { boards, notes } from "#test/example.ts";

const tags = (...features: Parameters<typeof group>[0]): readonly string[] => [...group(features).requests.keys()].toSorted();

describe("group", () => {
	it("merges the features into one group without a clash", () => {
		expect(tags(notes, boards)).toEqual(["boards.all", "notes.onBoard", "notes.write"]);
	});

	it("assembles the features with hand-made groups that own their own namespaces", () => {
		const ping = { payload: Schema.Struct({}), success: Schema.Void };
		const assembled = assemble([notes, boards], RpcGroup.make(Rpc.make("restart.drain", ping)), RpcGroup.make(Rpc.make("runner.append", ping)));
		expect([...assembled.requests.keys()].toSorted()).toEqual(["boards.all", "notes.onBoard", "notes.write", "restart.drain", "runner.append"]);
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
