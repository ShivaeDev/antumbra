import { describe, expect, it } from "vitest";
import { nestingViolations } from "#lint/rules/nesting.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const path = "packages/x/src/mod.ts";

describe("nesting rule", () => {
	it("flags the eighth tab and reports its line", () => {
		const violations = nestingViolations(
			inventoryOf({
				sources: [{ content: "export {};\n\t\t\t\t\t\t\t\tvalue();\n", path }],
			}),
		);
		expect(violations).toEqual([
			{
				file: path,
				line: 2,
				message:
					"Indentation is 8+ tabs deep. Extract a named function or component.",
				rule: "nesting/max-depth",
			},
		]);
	});

	it("allows shallower source and generated declarations", () => {
		expect(
			nestingViolations(
				inventoryOf({
					sources: [
						{ content: "\t\t\t\t\t\t\tvalue();\n", path },
						{
							content: "\t\t\t\t\t\t\t\tvalue();\n",
							path: "packages/x/contract.d.ts",
						},
					],
				}),
			),
		).toEqual([]);
	});
});
