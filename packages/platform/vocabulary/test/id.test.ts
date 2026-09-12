import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect, it } from "@effect/vitest";

const READABLE = /^[0-9abcdefghjkmnpqrstvwxyz]{10}$/;

it("mints a short readable id that a directory and a branch can carry", () => {
	const many = new Set<string>();
	for (let taken = 0; taken < 1000; taken += 1) {
		const minted = Id.make();
		expect(minted).toMatch(READABLE);
		many.add(minted);
	}
	expect(many.size).toBe(1000);
});

it("derives the same short readable id from the same parts", () => {
	const agent = Id.derive("request-1", "agent");
	expect(agent).toMatch(READABLE);
	expect(Id.derive("request-1", "agent")).toBe(agent);
	expect(Id.derive("request-1", "session")).not.toBe(agent);
	expect(Id.derive("request-2", "agent")).not.toBe(agent);
	expect(Id.derive("a", "bc")).not.toBe(Id.derive("ab", "c"));
});

it("derives a readable id from a request that carries punctuation", () => {
	expect(Id.derive(JSON.stringify(["session-1", "call-9", ""]), "agent")).toMatch(READABLE);
});
