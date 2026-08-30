import { describe, expect, it } from "vitest";
import { summaryLine } from "#transcript/summary.ts";

describe("summaryLine", () => {
	it("says what the tool says a call is about before what it runs", () => {
		expect(
			summaryLine(
				JSON.stringify({
					command: 'cd "/Users/navigator/charts" && grep -rn shoal .',
					description: "Grep the charts for shoals",
				}),
			),
		).toBe("Grep the charts for shoals");
	});

	it("falls back to the argument the tool acts on when it names none", () => {
		expect(
			summaryLine(
				JSON.stringify({
					command: 'cd "/Users/navigator/charts" && grep -rn shoal .',
				}),
			),
		).toBe('cd "/Users/navigator/charts" && grep -rn shoal .');
	});

	it("keeps a path down to the two segments that tell files apart", () => {
		expect(
			summaryLine(
				JSON.stringify({
					file_path: "/Users/navigator/charts/packages/renderer/src/app.tsx",
					limit: 40,
				}),
			),
		).toBe("…/src/app.tsx");
	});

	it("leaves a short path whole", () => {
		expect(summaryLine(JSON.stringify({ path: "src/app.tsx" }))).toBe("src/app.tsx");
	});

	it("leaves a URL whole — its host is the part worth reading", () => {
		expect(
			summaryLine(
				JSON.stringify({
					prompt: "summarise",
					url: "https://charts.example/atlantic/soundings",
				}),
			),
		).toBe("https://charts.example/atlantic/soundings");
	});

	it("shows the first line and counts the rest", () => {
		expect(summaryLine(JSON.stringify({ command: "echo one\necho two\necho three" }))).toBe("echo one +2");
	});

	it("reads a bare string input the same way as a record", () => {
		expect(summaryLine('bash -lc "pnpm ready"')).toBe('bash -lc "pnpm ready"');
		expect(summaryLine("/Users/navigator/charts/one.ts\n/Users/navigator/charts/two.ts")).toBe("…/charts/one.ts +1");
	});

	it("says what it was handed when the input decodes as nothing at all", () => {
		expect(summaryLine('{"command":"pnpm ready"')).toBe('{"command":"pnpm ready"');
		expect(summaryLine("")).toBe("");
	});

	it("finds something to say in a record of unfamiliar keys", () => {
		expect(summaryLine(JSON.stringify({ count: 3, flag: true }))).toBe("3");
		expect(summaryLine(JSON.stringify({}))).toBe("");
	});
});
