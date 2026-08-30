import { describe, expect, it } from "vitest";
import { plainLine } from "#views/markdown-plain.ts";

describe("plainLine", () => {
	it("reads a heading as the words in it", () => {
		expect(plainLine("# Sound the shoals")).toBe("Sound the shoals");
	});

	it("folds a document into the one line a card has room for", () => {
		expect(plainLine("# Shoals\n\nTake **every** depth.\n\n- east\n- west")).toBe("Shoals Take every depth. east west");
	});

	it("keeps the words of a link and drops where it points", () => {
		expect(plainLine("see [the chart](https://charts.example/atlantic)")).toBe("see the chart");
	});

	it("reads a fenced block as the lines inside it", () => {
		expect(plainLine("run it:\n\n```sh\npnpm ready\n```")).toBe("run it: pnpm ready");
	});

	it("drops a rule rather than reading it as a line of dashes", () => {
		expect(plainLine("before\n\n---\n\nafter")).toBe("before after");
	});

	it("leaves an underscore that was never emphasis where it was", () => {
		expect(plainLine("read the file_path field")).toBe("read the file_path field");
	});

	it("says nothing for a description that says nothing", () => {
		expect(plainLine("")).toBe("");
	});
});
