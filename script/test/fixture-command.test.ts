import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { parseCommand } from "#fixture/command.ts";

describe("fixture commands", () => {
	it("captures dev by default and accepts a named production capture", () => {
		expect(Result.getOrThrow(parseCommand(["capture", "Long transcript"]))).toEqual({ name: "capture", label: "Long transcript", source: "dev" });
		expect(Result.getOrThrow(parseCommand(["capture", "release", "--source", "prod"]))).toEqual({
			name: "capture",
			label: "release",
			source: "prod",
		});
	});

	it("requires capture labels and rejects unknown source options", () => {
		for (const args of [["capture"], ["capture", ""], ["capture", "sample", "--source", "/tmp/data"], ["open", "5", "extra"]])
			expect(Result.isFailure(parseCommand(args))).toBe(true);
	});
});
