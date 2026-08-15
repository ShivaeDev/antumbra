import { describe, expect, it } from "vitest";
import { pragmaViolations } from "#lint/rules/pragmas.ts";
import fixture from "#test/fixtures/pragma-cases.json" with { type: "json" };
import { inventoryOf } from "#test/support/inventory.ts";

const registry = (entries: readonly unknown[]): string =>
	JSON.stringify(entries);

describe("pragma rules", () => {
	it("flags a pragma missing from the registry", () => {
		const violations = pragmaViolations(
			inventoryOf({ pragmaRegistry: registry([]), sources: [fixture.source] }),
		);
		expect(violations[0]?.rule).toBe("pragmas/unregistered");
		expect(violations[0]?.message).toContain("without a registry entry");
		expect(violations[0]?.line).toBe(1);
	});

	it("allows a registered pragma", () => {
		expect(
			pragmaViolations(
				inventoryOf({
					pragmaRegistry: registry([
						{
							file: fixture.source.path,
							pragma: fixture.pragma,
							reason: "probing the guard",
						},
					]),
					sources: [fixture.source],
				}),
			),
		).toEqual([]);
	});

	it("treats a missing or unreadable registry as empty", () => {
		expect(
			pragmaViolations(
				inventoryOf({ pragmaRegistry: "", sources: [fixture.source] }),
			),
		).toHaveLength(1);
	});

	it("ignores pragma vocabulary outside comments", () => {
		const source = {
			content:
				"export const text = '@ts-expect-error';\nexport const View = () => <div>@ts-expect-error</div>;\n",
			path: "packages/x/src/view.tsx",
		};
		expect(pragmaViolations(inventoryOf({ sources: [source] }))).toEqual([]);
	});
});
