import { describe, expect, it } from "vitest";
import { pragmaViolations } from "#lint/rules/pragmas.ts";
import rawFixture from "#test/fixtures/pragma-cases.json" with { type: "json" };
import { decodePragmaFixture } from "#test/support/fixture-schemas.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const registry = (entries: readonly unknown[]): string =>
	JSON.stringify(entries);
const fixture = decodePragmaFixture(rawFixture);

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

	it("reports a malformed registry instead of treating it as empty", () => {
		const violations = pragmaViolations(
			inventoryOf({ pragmaRegistry: "{oops", sources: [fixture.source] }),
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.rule).toBe("pragmas/registry-invalid");
		expect(violations[0]?.file).toBe("script/pragma-registry.json");
	});

	it("requires each registry entry to carry its reason", () => {
		const violations = pragmaViolations(
			inventoryOf({
				pragmaRegistry: registry([
					{ file: fixture.source.path, pragma: fixture.pragma },
				]),
				sources: [fixture.source],
			}),
		);
		expect(violations[0]?.rule).toBe("pragmas/registry-invalid");
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
