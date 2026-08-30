import { describe, expect, it } from "vitest";
import { structureViolations } from "#lint/rules/structure.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const lines = (count: number): string => "export const n = 1;\n".repeat(count);

describe("structure rules", () => {
	it("flags a source file over 150 lines", () => {
		const violations = structureViolations(
			inventoryOf({
				sources: [{ content: lines(151), path: "packages/x/src/big.ts" }],
			}),
		);
		expect(violations[0]?.rule).toBe("structure/max-lines");
		expect(violations[0]?.file).toBe("packages/x/src/big.ts");
		expect(violations[0]?.message).toContain("150-line limit");
	});

	it("holds test files to a 300-line limit", () => {
		const violations = structureViolations(
			inventoryOf({
				sources: [
					{ content: lines(200), path: "packages/x/test/wide.test.ts" },
					{ content: lines(301), path: "packages/x/test/wider.test.ts" },
				],
			}),
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.message).toContain("300-line limit");
	});

	it("flags an index.ts barrel outside the package entry", () => {
		const violations = structureViolations(
			inventoryOf({
				sources: [{ content: "export {};\n", path: "packages/x/src/things/index.ts" }],
			}),
		);
		expect(violations[0]?.rule).toBe("structure/no-barrel");
		expect(violations[0]?.message).toContain("barrels are banned");
	});

	it("allows the package entry index.ts", () => {
		expect(
			structureViolations(
				inventoryOf({
					sources: [{ content: "export {};\n", path: "packages/x/src/index.ts" }],
				}),
			),
		).toEqual([]);
	});

	it("exempts declaration files from the line cap", () => {
		expect(
			structureViolations(
				inventoryOf({
					sources: [
						{
							content: "export type N = number;\n".repeat(200),
							path: "packages/x/contract.d.ts",
						},
					],
				}),
			),
		).toEqual([]);
	});
});
