import { describe, expect, it } from "vitest";
import { parseRepoLines } from "#views/repo-lines.ts";

describe("parseRepoLines", () => {
	it("returns no repos for an empty box", () => {
		expect(parseRepoLines("")).toEqual([]);
		expect(parseRepoLines("  \n\n\t")).toEqual([]);
	});

	it("defaults the ref to main when only a source is given", () => {
		expect(parseRepoLines("/repos/antumbra")).toEqual([
			{ ref: "main", source: "/repos/antumbra" },
		]);
	});

	it("reads an explicit ref after whitespace", () => {
		expect(parseRepoLines("/repos/antumbra release/1.x")).toEqual([
			{ ref: "release/1.x", source: "/repos/antumbra" },
		]);
	});

	it("parses one repo per line and skips blanks", () => {
		expect(parseRepoLines("/a\n\n/b dev\n")).toEqual([
			{ ref: "main", source: "/a" },
			{ ref: "dev", source: "/b" },
		]);
	});
});
