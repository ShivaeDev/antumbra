import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { parseCommand } from "#fixture/command.ts";

describe("fixture commands", () => {
	it("captures dev by default and accepts a named production capture", () => {
		expect(Result.getOrThrow(parseCommand(["capture", "Long transcript"]))).toEqual({
			name: "capture",
			label: "Long transcript",
			source: "dev",
			target: "journal",
		});
		expect(Result.getOrThrow(parseCommand(["capture", "release", "--source", "prod"]))).toEqual({
			name: "capture",
			label: "release",
			source: "prod",
			target: "journal",
		});
	});

	it("targets PostgreSQL checks after capture or for an archived fixture", () => {
		expect(Result.getOrThrow(parseCommand(["capture", "release", "--source", "prod", "--target", "postgres"]))).toEqual({
			name: "capture",
			label: "release",
			source: "prod",
			target: "postgres",
		});
		expect(Result.getOrThrow(parseCommand(["check", "release", "--target", "postgres"]))).toEqual({
			name: "check",
			selector: "release",
			target: "postgres",
		});
	});

	it("requires capture labels and rejects unknown source options", () => {
		for (const args of [["capture"], ["capture", ""], ["capture", "sample", "--source", "/tmp/data"], ["open", "5", "extra"]])
			expect(Result.isFailure(parseCommand(args))).toBe(true);
	});
});
