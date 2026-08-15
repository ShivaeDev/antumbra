import { describe, expect, it } from "vitest";
import { manifestViolations } from "#lint/rules/manifests.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const manifest = (path: string, value: unknown) => ({
	path,
	raw: JSON.stringify(value),
});

describe("manifest rules", () => {
	it("flags a package.json version that bypasses the catalog", () => {
		const violations = manifestViolations(
			inventoryOf({
				manifests: [
					manifest("packages/x/package.json", {
						devDependencies: { "left-pad": "1.3.0" },
					}),
				],
				workspaceCatalog: "catalog:\n  effect: 4.0.0\n",
			}),
		);
		expect(violations[0]?.rule).toBe("manifests/catalog-only");
		expect(violations[0]?.message).toContain("left-pad");
		expect(violations[0]?.message).toContain("bypasses the catalog");
	});

	it("flags a ranged catalog entry", () => {
		const violations = manifestViolations(
			inventoryOf({ workspaceCatalog: "catalog:\n  effect: ^4.0.0\n" }),
		);
		expect(violations[0]?.rule).toBe("manifests/exact-catalog-version");
		expect(violations[0]?.message).toContain("not an exact version");
	});

	it("allows exact catalog entries referenced via catalog: and workspace:", () => {
		const cleanManifests = [
			manifest("package.json", { devDependencies: { effect: "catalog:" } }),
			manifest("packages/x/package.json", {
				dependencies: {
					"@antumbra/contract": "workspace:*",
					effect: "catalog:",
				},
			}),
		];
		expect(
			manifestViolations(
				inventoryOf({
					manifests: cleanManifests,
					workspaceCatalog:
						'catalog:\n  "@biomejs/biome": 2.5.1\n  effect: 4.0.0-beta.102\n  typescript: npm:@typescript/typescript6@6.0.2\n',
				}),
			),
		).toEqual([]);
	});

	it("stops reading catalog entries at the next top-level key", () => {
		expect(
			manifestViolations(
				inventoryOf({
					workspaceCatalog:
						"catalog:\n  effect: 4.0.0\noverrides:\n  semver: ^7\n",
				}),
			),
		).toEqual([]);
	});

	it("flags a manifest that is not readable JSON", () => {
		const violations = manifestViolations(
			inventoryOf({ manifests: [{ path: "package.json", raw: "{oops" }] }),
		);
		expect(violations[0]?.rule).toBe("manifests/unreadable");
	});
});
