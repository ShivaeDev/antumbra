import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { contractViolations } from "#lint/rules/contracts.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const check = (content: string, path: string) =>
	Effect.runSync(
		contractViolations(inventoryOf({ sources: [{ content, path }] })),
	);

describe("contract rules", () => {
	it("flags a contract declaration whose imports do not resolve", () => {
		const violations = check(
			"import type { T } from '@antumbra-nonexistent/types';\nexport type Contract = T;\n",
			"packages/x/contract.d.ts",
		);
		expect(violations[0]?.rule).toBe("contracts/declaration-resolves");
		expect(violations[0]?.file).toBe("packages/x/contract.d.ts");
		expect(violations[0]?.message).toContain("TS2307");
		expect(violations[0]?.message).toContain("skipLibCheck");
	});

	it("allows a contract declaration whose types resolve", () => {
		expect(
			check(
				"export type Contract = { readonly key: string };\n",
				"packages/x/contract.d.ts",
			),
		).toEqual([]);
	});

	it("ignores declarations that are not generated contracts", () => {
		expect(
			check(
				"import type { T } from '@antumbra-nonexistent/types';\nexport type Other = T;\n",
				"packages/x/other.d.ts",
			),
		).toEqual([]);
	});
});
