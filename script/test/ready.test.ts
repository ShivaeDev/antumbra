import { describe, expect, it } from "vitest";
import { steps } from "#ready/steps.ts";
import { readyKit } from "#test/ready-kit.ts";

describe("ready runner", () => {
	readyKit.it("runs every step in order and summarizes a full pass", [], function* ({ run }) {
		const { executed, lines, ok } = yield* run(["one", "two", "three"], undefined);
		expect(ok).toBe(true);
		expect(executed).toEqual(["one", "two", "three"]);
		expect(lines).toEqual(["passed one", "passed two", "passed three", "summary 3/3"]);
	});

	readyKit.it("stops at the first failure and reports how far it got", [], function* ({ run }) {
		const { executed, lines, ok } = yield* run(["one", "two", "three"], "two");
		expect(ok).toBe(false);
		expect(executed).toEqual(["one", "two"]);
		expect(lines).toEqual(["passed one", "failed two exit 2", "summary 1/3"]);
	});
});

describe("ready steps", () => {
	it("typechecks the whole workspace as one program and leaves tests to CI", () => {
		expect(steps.map((step) => step.name)).toEqual(["formatting", "lint", "boundaries", "typecheck"]);
		expect(steps.at(-1)).toEqual({ args: ["run", "typecheck:workspace"], command: "pnpm", name: "typecheck" });
	});
});
