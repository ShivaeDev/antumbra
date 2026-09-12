import { extending } from "@antumbra/platform-feature/extension.ts";
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

	it("prefixes a group extending a feature with that feature's name", () => {
		const extension = extending(notes, RpcGroup.make(Rpc.make("tail", { payload: { id: Schema.String }, success: Schema.Void })));
		expect([...extension.requests.keys()]).toEqual(["notes.tail"]);
	});

	it("assembles the features and the hand-made groups into one group", () => {
		const extension = extending(notes, RpcGroup.make(Rpc.make("tail", { payload: { id: Schema.String }, success: Schema.Void })));
		const assembled = assemble([notes, boards], extension);
		expect([...assembled.requests.keys()].toSorted()).toEqual(["boards.all", "notes.onBoard", "notes.tail", "notes.write"]);
	});
});
