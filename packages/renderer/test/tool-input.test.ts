import { describe, expect, it } from "vitest";
import { toolFields } from "#transcript/tool-input.ts";

describe("toolFields", () => {
	it("hands a command back as the text it was before it was encoded", () => {
		const command = 'cd "/charts" && pnpm ready\npnpm test';

		const [field] = toolFields(JSON.stringify({ command }));

		expect(field?.name).toBe("command");
		expect(field?.text).toBe(command);
	});

	it("stands every argument under the name the tool gave it", () => {
		const fields = toolFields(
			JSON.stringify({ command: "pnpm ready", description: "Run the gates" }),
		);

		expect(fields.map((field) => field.name)).toEqual([
			"command",
			"description",
		]);
	});

	it("lays out an argument that is not text with its shape kept", () => {
		const [field] = toolFields(JSON.stringify({ edits: [{ from: "a" }] }));

		expect(field?.text).toContain('"from": "a"');
		expect(field?.text).toContain("\n");
	});

	it("finds no arguments in an input that is already text", () => {
		expect(toolFields("pnpm ready")).toEqual([]);
		expect(toolFields('{"command":"pnpm ready"')).toEqual([]);
	});
});
