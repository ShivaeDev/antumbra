import { describe, expect, it } from "vitest";
import { toolSummary } from "#transcript/tool-summary.ts";

describe("toolSummary", () => {
	it("says what the tool says a call is about before what it runs", () => {
		expect(
			toolSummary(
				JSON.stringify({
					command: 'cd "/Users/navigator/charts" && grep -rn shoal .',
					description: "Grep the charts for shoals",
				}),
			),
		).toBe("Grep the charts for shoals");
	});

	it("falls back to the argument the tool acts on when it names none", () => {
		expect(
			toolSummary(
				JSON.stringify({
					command: 'cd "/Users/navigator/charts" && grep -rn shoal .',
				}),
			),
		).toBe('cd "/Users/navigator/charts" && grep -rn shoal .');
	});

	it("keeps a path down to the two segments that tell files apart", () => {
		expect(
			toolSummary(
				JSON.stringify({
					file_path: "/Users/navigator/charts/packages/renderer/src/app.tsx",
					limit: 40,
				}),
			),
		).toBe("…/src/app.tsx");
	});

	it("leaves a short path whole", () => {
		expect(toolSummary(JSON.stringify({ path: "src/app.tsx" }))).toBe(
			"src/app.tsx",
		);
	});

	it("leaves a URL whole — its host is the part worth reading", () => {
		expect(
			toolSummary(
				JSON.stringify({
					prompt: "summarise",
					url: "https://charts.example/atlantic/soundings",
				}),
			),
		).toBe("https://charts.example/atlantic/soundings");
	});

	it("shows the first line and counts the rest", () => {
		expect(
			toolSummary(
				JSON.stringify({ command: "echo one\necho two\necho three" }),
			),
		).toBe("echo one +2");
	});

	it("reads a bare string input the same way as a record", () => {
		expect(toolSummary('bash -lc "pnpm ready"')).toBe('bash -lc "pnpm ready"');
		expect(
			toolSummary(
				"/Users/navigator/charts/one.ts\n/Users/navigator/charts/two.ts",
			),
		).toBe("…/charts/one.ts +1");
	});

	it("says what it was handed when the input decodes as nothing at all", () => {
		expect(toolSummary('{"command":"pnpm ready"')).toBe(
			'{"command":"pnpm ready"',
		);
		expect(toolSummary("")).toBe("");
	});

	it("finds something to say in a record of unfamiliar keys", () => {
		expect(toolSummary(JSON.stringify({ count: 3, flag: true }))).toBe("3");
		expect(toolSummary(JSON.stringify({}))).toBe("");
	});
});
